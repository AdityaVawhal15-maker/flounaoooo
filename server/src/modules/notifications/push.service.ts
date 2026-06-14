import webpush from "web-push";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

export const pushConfigured = Boolean(
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY,
);

if (pushConfigured) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Sends a notification to every device a user has registered. Dead
// subscriptions (410/404) are pruned automatically.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or was revoked — remove it.
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        } else {
          console.error("[push] send failed:", statusCode ?? err);
        }
      }
    }),
  );
}
