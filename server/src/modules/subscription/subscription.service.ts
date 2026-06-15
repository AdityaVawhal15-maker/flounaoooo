// Radiues Plus (₹50/mo) — the premium tier.
//
// IMPORTANT: live ride tracking, the driver map, OTP and the core "best pick"
// AI are FREE for everyone. Plus adds value on top — it never removes core
// capability. The gated perks:
//   • deeper AI: unlimited comparisons, budget-aware picks, price-drop alerts
//   • zero in-app convenience fees
//   • monthly savings report + "saved you more than ₹50 or it's free" guarantee

import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

export type PlusStatus = {
  active: boolean;
  since: string | null;
  until: string | null;
  pricePaise: number;
  perks: string[];
};

const PERKS = [
  "Unlimited AI comparisons & budget-aware picks",
  "Price-drop alerts across food, rides & shopping",
  "Zero in-app convenience fees",
  "Monthly savings report",
  "Saved-you-more-than-₹50 guarantee",
];

// A user is Plus iff the flag is on AND the period hasn't lapsed.
export function isPlusActive(user: {
  plusActive: boolean;
  plusUntil: Date | null;
}): boolean {
  if (!user.plusActive) return false;
  if (user.plusUntil && user.plusUntil.getTime() < Date.now()) return false;
  return true;
}

export async function getPlusStatus(userId: string): Promise<PlusStatus> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plusActive: true, plusSince: true, plusUntil: true },
  });
  const active = isPlusActive(user);
  return {
    active,
    since: user.plusSince?.toISOString() ?? null,
    until: user.plusUntil?.toISOString() ?? null,
    pricePaise: env.SUBSCRIPTION_PRICE_PAISE,
    perks: PERKS,
  };
}

// Activates a 30-day period. In production this is called after a successful
// Cashfree subscription charge; in dev it runs on a simulated activation.
export async function activatePlus(userId: string): Promise<PlusStatus> {
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { plusActive: true, plusSince: now, plusUntil: until },
  });
  return getPlusStatus(userId);
}

export async function cancelPlus(userId: string): Promise<PlusStatus> {
  await prisma.user.update({
    where: { id: userId },
    data: { plusActive: false },
  });
  return getPlusStatus(userId);
}

// Convenience fee charged on in-app orders for free users; waived for Plus.
// (Demonstrates a real, non-tracking perk that affects pricing.)
export const CONVENIENCE_FEE_PAISE = 700;
