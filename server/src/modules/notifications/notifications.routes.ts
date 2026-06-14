import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { env } from "../../config/env.js";
import { pushConfigured } from "./push.service.js";

export const notificationsRouter = Router();

// Public: lets the browser know whether push is available and which key to use.
notificationsRouter.get("/vapid", (_req, res) => {
  res.json({
    enabled: pushConfigured,
    publicKey: pushConfigured ? env.VAPID_PUBLIC_KEY : null,
  });
});

notificationsRouter.use(requireAuth);

const subscriptionBody = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().max(255),
    auth: z.string().max(255),
  }),
});

notificationsRouter.post(
  "/subscribe",
  validateBody(subscriptionBody),
  async (req, res, next) => {
    try {
      const { endpoint, keys } = req.body as z.infer<typeof subscriptionBody>;
      // Upsert by endpoint so re-subscribing or switching accounts is clean.
      await prisma.pushSubscription.upsert({
        where: { endpoint },
        create: {
          userId: req.userId!,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        update: { userId: req.userId!, p256dh: keys.p256dh, auth: keys.auth },
      });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

notificationsRouter.post(
  "/unsubscribe",
  validateBody(z.object({ endpoint: z.string().url().max(1000) })),
  async (req, res, next) => {
    try {
      const { endpoint } = req.body as { endpoint: string };
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: req.userId! },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
