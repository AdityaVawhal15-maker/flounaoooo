import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { sendPrebuiltEmail } from "../../lib/mailer.js";
import { notificationEmail } from "../../lib/emailTemplates.js";

// ---------------------------------------------------------------------------
// Email-notification outbox.
//
// Every non-OTP email is enqueued as a Notification row and drained by the
// worker below. That buys us, in one place: idempotency (dedupeKey),
// per-category preference gating, a per-user daily cap so no bug can carpet-
// bomb an inbox, and retries with a terminal `failed` state. Adding a new
// email = add a registry entry + call `enqueueNotification` from the event.
// ---------------------------------------------------------------------------

export type NotificationCategory = "security" | "orders" | "money" | "tips";

type Payload = Record<string, string>;

type RegistryEntry = {
  category: NotificationCategory;
  build: (p: Payload) => {
    subject: string;
    heading: string;
    lines: string[];
    ctaLabel?: string;
    ctaPath?: string;
    footnote?: string;
  };
};

const SECURITY_FOOTNOTE =
  "If this wasn't you, reset your password immediately and contact support from the Help section.";

export const NOTIFICATION_TYPES: Record<string, RegistryEntry> = {
  "security.password_changed": {
    category: "security",
    build: () => ({
      subject: "Your Radiues password was changed",
      heading: "Password changed",
      lines: [
        "The password for your Radiues account was just changed.",
        "If you did this, you're all set — no action needed.",
      ],
      ctaLabel: "Review account",
      ctaPath: "/profile/settings",
      footnote: SECURITY_FOOTNOTE,
    }),
  },
  "security.address_added": {
    category: "security",
    build: (p) => ({
      subject: "A delivery address was added to your account",
      heading: "New address on your account",
      lines: [
        `A new delivery address${p.label ? ` ("${p.label}")` : ""} was just saved to your Radiues account.`,
        "If you added it, ignore this email.",
      ],
      ctaLabel: "View addresses",
      ctaPath: "/profile/addresses",
      footnote: SECURITY_FOOTNOTE,
    }),
  },
  "security.suspicious_login": {
    category: "security",
    build: (p) => ({
      subject: "Your Radiues account was just accessed",
      heading: "Sign-in after failed attempts",
      lines: [
        `Someone signed in to your account${p.attempts ? ` after ${p.attempts} failed password attempt${p.attempts === "1" ? "" : "s"}` : ""}.`,
        "If that was you, no action is needed — you can ignore this email.",
      ],
      ctaLabel: "Secure my account",
      ctaPath: "/profile/settings",
      footnote: SECURITY_FOOTNOTE,
    }),
  },
  "security.account_deletion_requested": {
    category: "security",
    build: () => ({
      subject: "Your Radiues account is scheduled for deletion",
      heading: "Account deletion requested",
      lines: [
        "We've received a request to delete your Radiues account. It will be permanently removed after a 7-day grace period.",
        "Changed your mind? Sign in any time in the next 7 days to keep your account and cancel the deletion.",
      ],
      ctaLabel: "Keep my account",
      ctaPath: "/profile/settings",
      footnote:
        "If you didn't request this, sign in immediately and change your password — someone may have access to your account.",
    }),
  },
  "orders.refund_approved": {
    category: "orders",
    build: (p) => ({
      subject: `Refund approved — ${p.title ?? "your order"}`,
      heading: "Your refund is on its way",
      lines: [
        `Your refund for ${p.title ?? "your order"}${p.amount ? ` (${p.amount})` : ""} has been approved.`,
        "The money returns to your original payment method, usually within 5–7 business days.",
      ],
      ctaLabel: "View order",
      ctaPath: p.orderId ? `/orders/${p.orderId}` : "/history",
    }),
  },
  "orders.cancelled": {
    category: "orders",
    build: (p) => ({
      subject: `Order cancelled — ${p.title ?? "your order"}`,
      heading: "Your order was cancelled",
      lines: [
        `${p.title ?? "Your order"} has been cancelled${p.reason ? ` (${p.reason})` : ""}.`,
        "If you already paid, the refund is being processed automatically.",
      ],
      ctaLabel: "View details",
      ctaPath: p.orderId ? `/orders/${p.orderId}` : "/history",
    }),
  },
  "plus.activated": {
    category: "orders", // subscription receipts ride the transactional gate
    build: (p) => ({
      subject: "Welcome to Radiues Plus 🎉",
      heading: "Your Plus membership is active",
      lines: [
        `Radiues Plus is now active${p.until ? ` until ${p.until}` : ""}. You're unlocking deeper AI picks, price-drop alerts, zero convenience fees and the savings guarantee.`,
        "We'll email you before your next renewal so there are never any surprises.",
      ],
      ctaLabel: "Explore Plus",
      ctaPath: "/profile/plus",
    }),
  },
  "plus.renewal_reminder": {
    category: "orders",
    build: (p) => ({
      subject: "Your Radiues Plus renews soon",
      heading: "Heads up — Plus renews in 3 days",
      lines: [
        `Your Radiues Plus membership renews${p.until ? ` on ${p.until}` : " soon"} for ${p.price ?? "₹50"}.`,
        "Nothing to do if you'd like to continue. If not, you can cancel any time before then.",
      ],
      ctaLabel: "Manage membership",
      ctaPath: "/profile/plus",
    }),
  },
  "plus.payment_failed": {
    category: "orders",
    build: () => ({
      subject: "We couldn't renew your Radiues Plus",
      heading: "Your Plus renewal didn't go through",
      lines: [
        "We tried to renew your Radiues Plus membership but the payment didn't succeed.",
        "Update your payment method to keep your Plus perks — we'll retry automatically.",
      ],
      ctaLabel: "Fix payment",
      ctaPath: "/profile/plus",
    }),
  },
  "plus.expired": {
    category: "orders",
    build: () => ({
      subject: "Your Radiues Plus has ended",
      heading: "Your Plus membership expired",
      lines: [
        "Your Radiues Plus membership has ended. Core Radiues — best-pick AI, live tracking and OTP — stays free, always.",
        "Renew any time to bring back deeper AI, price-drop alerts and the savings guarantee.",
      ],
      ctaLabel: "Renew Plus",
      ctaPath: "/profile/plus",
    }),
  },
  "money.savings_milestone": {
    category: "money",
    build: (p) => ({
      subject: `You've saved ${p.amount} with Radiues 🎉`,
      heading: `${p.amount} saved — nice going!`,
      lines: [
        `Your lifetime savings on Radiues just crossed ${p.amount}.`,
        "Every order compares prices across platforms so you always pay the least.",
      ],
      ctaLabel: "See your savings",
      ctaPath: "/history",
    }),
  },
  "tips.feature_announcement": {
    category: "tips",
    build: (p) => ({
      subject: p.subject ?? "New on Radiues",
      heading: p.heading ?? "New on Radiues",
      lines: [p.body ?? ""],
      ctaLabel: p.ctaLabel,
      ctaPath: p.ctaPath,
    }),
  },
};

// Non-security emails per user per day, across categories. Security mail is
// never capped.
const DAILY_CAP = 8;
const MAX_ATTEMPTS = 3;
const BATCH = 25;

// Test hook — what the worker "delivered", visible to assertions.
export const outboxDelivered: Array<{ to: string; type: string; subject: string }> =
  [];

export async function enqueueNotification(
  userId: string,
  type: keyof typeof NOTIFICATION_TYPES | (string & {}),
  payload: Payload = {},
  opts: { dedupeKey?: string } = {},
) {
  if (!NOTIFICATION_TYPES[type]) {
    // Unknown type is a programming error — fail loudly in dev/test, softly in prod.
    const msg = `[outbox] unknown notification type "${type}"`;
    if (env.NODE_ENV === "production") {
      console.error(msg);
      return null;
    }
    throw new Error(msg);
  }
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        payload: JSON.stringify(payload),
        dedupeKey: opts.dedupeKey ?? null,
      },
    });
  } catch (err) {
    // Unique violation on dedupeKey → already queued/sent once. That's the point.
    if ((err as { code?: string }).code === "P2002") return null;
    throw err;
  }
}

export async function drainOutbox() {
  const batch = await prisma.notification.findMany({
    where: { status: "queued", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    include: {
      user: {
        select: {
          email: true,
          emailUpdates: true,
          emailMoneyUpdates: true,
          emailTips: true,
        },
      },
    },
  });

  for (const n of batch) {
    const entry = NOTIFICATION_TYPES[n.type];
    if (!entry) {
      await mark(n.id, "failed", "unknown type");
      continue;
    }

    // Category gate — security always sends.
    const gates: Record<NotificationCategory, boolean> = {
      security: true,
      orders: n.user.emailUpdates,
      money: n.user.emailMoneyUpdates,
      tips: n.user.emailTips,
    };
    if (!gates[entry.category]) {
      await mark(n.id, "skipped", "preference off");
      continue;
    }

    // Daily cap for everything except security.
    if (entry.category !== "security") {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const sentToday = await prisma.notification.count({
        where: { userId: n.userId, status: "sent", sentAt: { gte: since } },
      });
      if (sentToday >= DAILY_CAP) {
        await mark(n.id, "skipped", "daily cap");
        continue;
      }
    }

    try {
      const mail = notificationEmail({
        ...entry.build(JSON.parse(n.payload) as Payload),
      });
      await sendPrebuiltEmail(n.user.email, mail);
      if (env.NODE_ENV === "test") {
        outboxDelivered.push({ to: n.user.email, type: n.type, subject: mail.subject });
      }
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "sent", sentAt: new Date(), error: null },
      });
    } catch (err) {
      const attempts = n.attempts + 1;
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          attempts,
          status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  return batch.length;
}

function mark(id: string, status: string, error: string) {
  return prisma.notification.update({ where: { id }, data: { status, error } });
}

export function startOutboxWorker(intervalMs = 30_000) {
  const timer = setInterval(() => {
    drainOutbox().catch((err) => console.error("[outbox] drain failed:", err));
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
