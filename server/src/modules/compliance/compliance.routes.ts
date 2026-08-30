// Everything the privacy and cookie policies promise a person can do.
//
// Kept in its own router rather than folded into /api/users because these are
// legal rights with published deadlines attached, and having them in one place
// means "show me where the app implements the privacy policy" has an answer
// shorter than "read the user module".

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { verifyPassword } from "../../lib/tokens.js";
import { credentialLimiter } from "../../middleware/rateLimit.js";
import { POLICY_VERSION, PRIVACY_REQUEST_SLA } from "../../lib/policy.js";
import {
  COOKIES_IN_USE,
  recordConsent,
  saveCookieChoice,
  type CookieChoice,
} from "./consent.service.js";
import {
  buildExport,
  cancelDeletion,
  openPrivacyRequest,
  requestDeletion,
} from "./privacy.service.js";

export const complianceRouter = Router();
complianceRouter.use(requireAuth);

const cookieSchema = z
  .object({
    analytics: z.boolean(),
    advertising: z.boolean(),
    social: z.boolean(),
    performance: z.boolean(),
  })
  .strict();

// --- Cookies ---

// What is set, and what this account has chosen. The inventory is served from
// the server rather than hard-coded in the client so the page cannot drift
// from what is actually being set.
complianceRouter.get("/cookies", async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: {
        cookieChoiceAt: true,
        cookieAnalytics: true,
        cookieAdvertising: true,
        cookieSocial: true,
        cookiePerformance: true,
      },
    });
    res.json({
      chosenAt: user.cookieChoiceAt,
      choice: {
        analytics: user.cookieAnalytics,
        advertising: user.cookieAdvertising,
        social: user.cookieSocial,
        performance: user.cookiePerformance,
      },
      inUse: COOKIES_IN_USE,
      policyVersion: POLICY_VERSION,
    });
  } catch (err) {
    next(err);
  }
});

complianceRouter.put(
  "/cookies",
  validateBody(cookieSchema),
  async (req, res, next) => {
    try {
      await saveCookieChoice(req.userId!, req.body as CookieChoice, {
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// --- Model training (privacy policy 6.4) ---

complianceRouter.put(
  "/ai-training",
  validateBody(z.object({ optOut: z.boolean() }).strict()),
  async (req, res, next) => {
    try {
      const { optOut } = req.body as { optOut: boolean };
      await prisma.user.update({
        where: { id: req.userId! },
        data: { aiTrainingOptOut: optOut },
      });
      // Recorded as a consent event: granted is the inverse of opting out.
      await recordConsent(req.userId!, "ai_training", !optOut, {
        version: POLICY_VERSION,
        ctx: { ip: req.ip, userAgent: req.get("user-agent") },
      });
      if (optOut) await openPrivacyRequest(req.userId!, "training_opt_out");
      res.json({ ok: true, optOut });
    } catch (err) {
      next(err);
    }
  },
);

// --- A copy of your data (6.1) ---

// Built and returned in one request rather than mailed later. The policy
// allows 30 days; there is no reason to take them when the data is one query
// away, and a deadline met immediately is a deadline that cannot be missed.
complianceRouter.get("/export", credentialLimiter, async (req, res, next) => {
  try {
    const request = await openPrivacyRequest(req.userId!, "export");
    const bundle = await buildExport(req.userId!);
    await prisma.privacyRequest.update({
      where: { id: request.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + PRIVACY_REQUEST_SLA.exportDownloadableMs),
      },
    });
    // Content-Disposition rather than a link: nothing is stored server-side,
    // so there is no export sitting at a URL waiting to be found.
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="flouna-data-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    next(err);
  }
});

// --- Erasure (6.2) ---

complianceRouter.get("/deletion", async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.userId! },
      select: { deletionRequestedAt: true, deletionScheduledFor: true },
    });
    res.json({
      requestedAt: user.deletionRequestedAt,
      scheduledFor: user.deletionScheduledFor,
    });
  } catch (err) {
    next(err);
  }
});

// Password required. Erasure is irreversible and a borrowed phone should not be
// enough to trigger it, so this re-proves the person rather than the session.
// Google-only accounts have no password to check; they confirm by typing their
// email address instead, which is the strongest thing available without
// inventing a second flow.
complianceRouter.post(
  "/deletion",
  credentialLimiter,
  validateBody(
    z.object({
      password: z.string().min(1).max(200).optional(),
      confirmEmail: z.string().trim().email().optional(),
      reason: z.string().trim().max(500).optional(),
    }).strict(),
  ),
  async (req, res, next) => {
    try {
      const { password, confirmEmail } = req.body as {
        password?: string;
        confirmEmail?: string;
      };
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.userId! },
        select: { id: true, email: true, passwordHash: true, deletionScheduledFor: true },
      });

      if (user.deletionScheduledFor) {
        throw new ApiError(409, "Deletion is already scheduled for this account");
      }

      if (user.passwordHash) {
        if (!password || !(await verifyPassword(password, user.passwordHash))) {
          throw new ApiError(403, "That password is not correct");
        }
      } else if (
        !confirmEmail ||
        confirmEmail.toLowerCase() !== user.email.toLowerCase()
      ) {
        throw new ApiError(403, "Type your email address to confirm");
      }

      const { scheduledFor } = await requestDeletion(user.id);
      res.status(202).json({
        ok: true,
        scheduledFor,
        message:
          "Your account is scheduled for deletion. You can cancel any time before then by signing in.",
      });
    } catch (err) {
      next(err);
    }
  },
);

complianceRouter.delete("/deletion", async (req, res, next) => {
  try {
    await cancelDeletion(req.userId!);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- The consent log, shown back to the person it is about ---

complianceRouter.get("/consents", async (req, res, next) => {
  try {
    const consents = await prisma.consentRecord.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        kind: true,
        granted: true,
        version: true,
        detail: true,
        createdAt: true,
      },
    });
    res.json({ consents });
  } catch (err) {
    next(err);
  }
});
