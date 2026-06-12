import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma.js";
import { sendOtpEmail } from "../../lib/mailer.js";
import {
  clearAuthCookies,
  hashPassword,
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  signAccessToken,
  verifyPassword,
} from "../../lib/tokens.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/error.js";
import { consumeOtp, createOtp } from "./otp.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

// Strict limit on credential/OTP endpoints — slows brute force and OTP abuse.
// Relaxed under test so the suite isn't throttled by its own requests.
const sensitiveLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    avatarUrl: user.avatarUrl,
  };
}

async function startSession(
  res: Parameters<typeof setAuthCookies>[0],
  userId: string,
) {
  const access = signAccessToken(userId);
  const refresh = await issueRefreshToken(userId);
  setAuthCookies(res, access, refresh);
}

// ---------- email + password signup with email OTP verification ----------

authRouter.post(
  "/signup",
  sensitiveLimit,
  validateBody(
    z.object({
      name: z.string().trim().min(2).max(80),
      email: emailSchema,
      password: passwordSchema,
    }),
  ),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body as {
        name: string;
        email: string;
        password: string;
      };

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.emailVerified) {
        throw new ApiError(409, "An account with this email already exists");
      }

      const passwordHash = await hashPassword(password);
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { name, passwordHash },
          })
        : await prisma.user.create({ data: { name, email, passwordHash } });

      const code = await createOtp({
        userId: user.id,
        channel: "email",
        target: email,
        purpose: "signup",
      });
      await sendOtpEmail(email, code);

      res.status(201).json({ ok: true, next: "verify-email" });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/verify-email",
  sensitiveLimit,
  validateBody(
    z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) }),
  ),
  async (req, res, next) => {
    try {
      const { email, code } = req.body as { email: string; code: string };
      const ok = await consumeOtp({ target: email, purpose: "signup", code });
      if (!ok) throw new ApiError(400, "Invalid or expired code");

      const user = await prisma.user.update({
        where: { email },
        data: { emailVerified: true },
      });
      await startSession(res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/resend-otp",
  sensitiveLimit,
  validateBody(z.object({ email: emailSchema })),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const user = await prisma.user.findUnique({ where: { email } });
      // Don't reveal whether the email exists — respond identically either way.
      if (user && !user.emailVerified) {
        const code = await createOtp({
          userId: user.id,
          channel: "email",
          target: email,
          purpose: "signup",
        });
        await sendOtpEmail(email, code);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- login ----------

authRouter.post(
  "/login",
  sensitiveLimit,
  validateBody(z.object({ email: emailSchema, password: z.string().min(1).max(128) })),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.user.findUnique({ where: { email } });
      // Single generic error for all failure modes — no account enumeration.
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError(401, "Incorrect email or password");
      }
      if (!user.emailVerified) {
        const code = await createOtp({
          userId: user.id,
          channel: "email",
          target: email,
          purpose: "signup",
        });
        await sendOtpEmail(email, code);
        return res.status(403).json({ error: "Email not verified", next: "verify-email" });
      }
      await startSession(res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- Google sign-in ----------

authRouter.post(
  "/google",
  sensitiveLimit,
  validateBody(z.object({ credential: z.string().min(10) })),
  async (req, res, next) => {
    try {
      if (!googleClient || !env.GOOGLE_CLIENT_ID) {
        throw new ApiError(503, "Google sign-in is not configured");
      }
      const { credential } = req.body as { credential: string };
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        throw new ApiError(401, "Google sign-in failed");
      }

      const email = payload.email.toLowerCase();
      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId: payload.sub }, { email }] },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: payload.name ?? email.split("@")[0] ?? "User",
            googleId: payload.sub,
            emailVerified: true,
            avatarUrl: payload.picture ?? null,
          },
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, emailVerified: true },
        });
      }

      await startSession(res, user.id);
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- forgot / reset password ----------

authRouter.post(
  "/forgot",
  sensitiveLimit,
  validateBody(z.object({ email: emailSchema })),
  async (req, res, next) => {
    try {
      const { email } = req.body as { email: string };
      const user = await prisma.user.findUnique({ where: { email } });
      // Identical response whether or not the account exists.
      if (user) {
        const code = await createOtp({
          userId: user.id,
          channel: "email",
          target: email,
          purpose: "reset",
        });
        await sendOtpEmail(email, code);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/reset",
  sensitiveLimit,
  validateBody(
    z.object({
      email: emailSchema,
      code: z.string().regex(/^\d{6}$/),
      password: passwordSchema,
    }),
  ),
  async (req, res, next) => {
    try {
      const { email, code, password } = req.body as {
        email: string;
        code: string;
        password: string;
      };
      const ok = await consumeOtp({ target: email, purpose: "reset", code });
      if (!ok) throw new ApiError(400, "Invalid or expired code");

      const user = await prisma.user.update({
        where: { email },
        data: { passwordHash: await hashPassword(password), emailVerified: true },
      });
      // Changing the password signs out every other device.
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- phone OTP (scaffolded — SMS provider integrated later) ----------

authRouter.post("/phone/send-otp", sensitiveLimit, (_req, res) => {
  res.status(501).json({ error: "Phone OTP is coming soon" });
});

// ---------- session lifecycle ----------

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (!raw) throw new ApiError(401, "Not authenticated");
    const rotated = await rotateRefreshToken(raw);
    if (!rotated) {
      clearAuthCookies(res);
      throw new ApiError(401, "Session expired");
    }
    setAuthCookies(res, signAccessToken(rotated.userId), rotated.token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res) => {
  const raw = req.cookies?.refresh_token as string | undefined;
  if (raw) await revokeRefreshToken(raw);
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw new ApiError(401, "Not authenticated");
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});
