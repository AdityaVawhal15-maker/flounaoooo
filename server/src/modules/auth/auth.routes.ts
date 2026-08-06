import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma.js";
import { sendOtpEmail, sendWelcomeEmail } from "../../lib/mailer.js";
import { enqueueNotification } from "../notifications/outbox.service.js";
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
import { sessionLimiter } from "../../middleware/rateLimit.js";
import { consumeOtp, createOtp } from "./otp.js";
import { env } from "../../config/env.js";
import { normalizeRole, isOperator } from "../../lib/rbac.js";

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
  role?: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    avatarUrl: user.avatarUrl,
    // Operator role for console routing; "user" for ordinary customers.
    role: normalizeRole(user.role),
  };
}

async function startSession(
  res: Parameters<typeof setAuthCookies>[0],
  userId: string,
  stepUp = false,
) {
  // Bake the current role into the access token so ordinary requests carry it.
  // requireRole still re-checks the DB for privileged routes, so a stale token
  // can never grant access that was revoked. `stepUp` marks a session that has
  // cleared operator 2FA — set only by the console verify flow.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const access = signAccessToken(userId, normalizeRole(user?.role), stepUp);
  const refresh = await issueRefreshToken(userId, stepUp);
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
      // Optional at sign-up. The form has always asked for these — they were
      // being discarded, so the account never kept what the user typed.
      phone: z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
        .optional(),
      dateOfBirth: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
        .optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { name, email, password, phone, dateOfBirth } = req.body as {
        name: string;
        email: string;
        password: string;
        phone?: string;
        dateOfBirth?: string;
      };

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.emailVerified) {
        throw new ApiError(409, "An account with this email already exists");
      }

      const passwordHash = await hashPassword(password);
      // Phone is unique — if someone else already claimed it, keep the signup
      // working rather than failing on an optional field.
      const phoneFree =
        phone && !(await prisma.user.findFirst({ where: { phone, NOT: { email } } }));
      const optional = {
        ...(phoneFree ? { phone } : {}),
        ...(dateOfBirth ? { dateOfBirth } : {}),
      };
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { name, passwordHash, ...optional },
          })
        : await prisma.user.create({
            data: { name, email, passwordHash, ...optional },
          });

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
      // Best-effort — never blocks or fails the verification response.
      void sendWelcomeEmail(user.email, user.name ?? "");
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

// After this many consecutive failures, the account is locked for a window.
const MAX_FAILED_LOGINS = 10;
const LOCKOUT_MS = 15 * 60_000;

authRouter.post(
  "/login",
  sensitiveLimit,
  validateBody(z.object({ email: emailSchema, password: z.string().min(1).max(128) })),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.user.findUnique({ where: { email } });

      // Account-level lockout (M3): blocks slow distributed grinding that a
      // per-IP limit alone wouldn't catch. Generic message — no enumeration.
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        throw new ApiError(429, "Too many attempts. Try again later.");
      }

      // Single generic error for all failure modes — no account enumeration.
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        if (user) {
          const failed = user.failedLogins + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLogins: failed,
              lockedUntil:
                failed >= MAX_FAILED_LOGINS
                  ? new Date(Date.now() + LOCKOUT_MS)
                  : null,
            },
          });
        }
        throw new ApiError(401, "Incorrect email or password");
      }

      // Successful auth — clear any failure counter / lock.
      if (user.failedLogins > 0 || user.lockedUntil) {
        // A login that succeeds right after failed attempts is worth flagging:
        // it's the shape of a guessed/leaked password finally getting in.
        if (user.failedLogins >= 2) {
          await enqueueNotification(user.id, "security.suspicious_login", {
            attempts: String(user.failedLogins),
          }).catch(() => {});
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null },
        });
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

// ---------- operator console login (password + email OTP step-up) ----------
//
// Two-factor gate for the back-office. Step 1 verifies the password; if the
// account is an operator we DON'T issue a session — we email a one-time code and
// ask for it. Step 2 verifies that code and only then starts a step-up-marked
// session that the console routes require. Ordinary users get the same flat 404
// the rest of the console surface returns, so this doesn't reveal who's an
// operator. A leaked operator password alone never reaches the back-office.

authRouter.post(
  "/console/login",
  sensitiveLimit,
  validateBody(z.object({ email: emailSchema, password: z.string().min(1).max(128) })),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.user.findUnique({ where: { email } });

      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        throw new ApiError(429, "Too many attempts. Try again later.");
      }

      // Password check first (generic error — no enumeration).
      const passwordOk =
        user?.passwordHash && (await verifyPassword(password, user.passwordHash));
      if (!user || !passwordOk) {
        if (user) {
          const failed = user.failedLogins + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLogins: failed,
              lockedUntil:
                failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null,
            },
          });
        }
        throw new ApiError(401, "Incorrect email or password");
      }

      // Valid credentials, but NOT an operator → hide that the console exists.
      if (!isOperator(normalizeRole(user.role))) {
        throw new ApiError(404, "Not found");
      }

      // Clear any failure counter on a good password.
      if (user.failedLogins > 0 || user.lockedUntil) {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: null },
        });
      }

      // Send the second factor. We do NOT start a session yet.
      const code = await createOtp({
        userId: user.id,
        channel: "email",
        target: email,
        purpose: "step_up",
      });
      await sendOtpEmail(email, code, "step_up");
      res.json({ next: "otp" });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/console/verify",
  sensitiveLimit,
  validateBody(
    z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) }),
  ),
  async (req, res, next) => {
    try {
      const { email, code } = req.body as { email: string; code: string };
      const user = await prisma.user.findUnique({ where: { email } });
      // Re-confirm operator status at verify time (role could have changed).
      if (!user || !isOperator(normalizeRole(user.role))) {
        throw new ApiError(404, "Not found");
      }
      if (user.suspendedAt) throw new ApiError(403, "Account suspended");

      const ok = await consumeOtp({ target: email, purpose: "step_up", code });
      if (!ok) throw new ApiError(401, "Invalid or expired code");

      // OTP cleared → start a step-up-verified session.
      await startSession(res, user.id, true);
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
      const { credential } = req.body as { credential: string };
      if (env.NODE_ENV === "development" && credential === "dev-mock-google") {
        const email = "dev@radiues.local";
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: "Local Developer",
              googleId: "dev-mock-google-id",
              emailVerified: true,
            },
          });
        }
        await startSession(res, user.id);
        return res.json({ user: publicUser(user) });
      }
      if (!googleClient || !env.GOOGLE_CLIENT_ID) {
        throw new ApiError(503, "Google sign-in is not configured");
      }
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
        await sendOtpEmail(email, code, "reset");
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
        data: {
          passwordHash: await hashPassword(password),
          emailVerified: true,
          failedLogins: 0,
          lockedUntil: null, // a successful reset clears any lockout
        },
      });
      // Changing the password signs out every other device.
      await prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // Security alert — one cheap insert, but never fails the reset.
      await enqueueNotification(user.id, "security.password_changed").catch(
        () => {},
      );
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

authRouter.post("/refresh", sessionLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (!raw) throw new ApiError(401, "Not authenticated");
    const rotated = await rotateRefreshToken(raw);
    if (!rotated) {
      clearAuthCookies(res);
      throw new ApiError(401, "Session expired");
    }
    // Re-read the role on refresh so a promotion/demotion propagates into the
    // new access token (and a suspended operator can be cut off here too).
    const user = await prisma.user.findUnique({
      where: { id: rotated.userId },
      select: { role: true, suspendedAt: true },
    });
    if (user?.suspendedAt) {
      clearAuthCookies(res);
      throw new ApiError(403, "Account suspended");
    }
    setAuthCookies(
      res,
      signAccessToken(rotated.userId, normalizeRole(user?.role), rotated.stepUp),
      rotated.token,
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", sessionLimiter, async (req, res) => {
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
