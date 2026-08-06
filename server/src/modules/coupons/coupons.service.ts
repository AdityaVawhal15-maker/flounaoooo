import { prisma } from "../../lib/prisma.js";

// Promo codes. The client only ever sends a code string — every rupee of
// discount is computed here from the coupon's own rules, so a tampered client
// can't invent a discount (same principle as order pricing).

export type CouponCheck =
  | { ok: true; couponId: string; code: string; description: string; discountPaise: number }
  | { ok: false; reason: string };

export function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

// `subtotalPaise` is what the discount applies to (items before fees).
export async function evaluateCoupon(opts: {
  code: string;
  userId: string;
  domain: "food" | "ride" | "shop";
  subtotalPaise: number;
}): Promise<CouponCheck> {
  const code = normaliseCode(opts.code);
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.active) {
    return { ok: false, reason: "That code isn't valid" };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This code has expired" };
  }
  if (coupon.domain !== "any" && coupon.domain !== opts.domain) {
    return {
      ok: false,
      reason:
        coupon.domain === "food"
          ? "This code works on food orders only"
          : coupon.domain === "ride"
          ? "This code works on rides only"
          : "This code isn't valid for this domain",
    };
  }
  if (opts.subtotalPaise < coupon.minOrderPaise) {
    return {
      ok: false,
      reason: `Spend at least ₹${Math.ceil(coupon.minOrderPaise / 100)} to use this code`,
    };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "This code has been fully claimed" };
  }

  // One redemption per user, per code.
  const already = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, userId: opts.userId },
  });
  if (already) return { ok: false, reason: "You've already used this code" };

  if (coupon.firstOrderOnly) {
    const paidBefore = await prisma.order.count({
      where: {
        userId: opts.userId,
        status: { in: ["confirmed", "in_progress", "completed"] },
      },
    });
    if (paidBefore > 0) {
      return { ok: false, reason: "This code is for your first order only" };
    }
  }

  // ---- discount, integer paise, never more than the subtotal ----
  let discount = 0;
  if (coupon.kind === "percent" && coupon.percentOff) {
    discount = Math.floor((opts.subtotalPaise * coupon.percentOff) / 100);
    if (coupon.maxDiscountPaise !== null) {
      discount = Math.min(discount, coupon.maxDiscountPaise);
    }
  } else if (coupon.kind === "flat" && coupon.valuePaise) {
    discount = coupon.valuePaise;
  }
  discount = Math.max(0, Math.min(discount, opts.subtotalPaise));

  if (discount === 0) return { ok: false, reason: "That code isn't valid" };

  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountPaise: discount,
  };
}

// Called inside the order-creation transaction once the order exists.
export async function redeemCoupon(opts: {
  couponId: string;
  userId: string;
  orderId: string;
  discountPaise: number;
}) {
  await prisma.$transaction([
    prisma.couponRedemption.create({
      data: {
        couponId: opts.couponId,
        userId: opts.userId,
        orderId: opts.orderId,
        discountPaise: opts.discountPaise,
      },
    }),
    prisma.coupon.update({
      where: { id: opts.couponId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
}

// Codes worth showing on the checkout screen — active, unexpired, not
// exhausted. Users shouldn't have to guess what exists.
export async function listOfferedCoupons(domain: "food" | "ride") {
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      domain: { in: [domain, "any"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { minOrderPaise: "asc" },
    take: 6,
  });
  return coupons
    .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
    .map((c) => ({
      code: c.code,
      description: c.description,
      minOrderPaise: c.minOrderPaise,
    }));
}
