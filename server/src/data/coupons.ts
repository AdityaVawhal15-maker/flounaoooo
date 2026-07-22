import { prisma } from "../lib/prisma.js";

// Demo promo codes so checkout is fully testable without a keyed backend or an
// ops console. Upserted on boot, so editing a value here updates the row and
// re-running never duplicates. Real campaigns will be created from the console.
const DEMO_COUPONS = [
  {
    code: "WELCOME50",
    description: "₹50 off your first order",
    kind: "flat",
    valuePaise: 5000,
    minOrderPaise: 15000,
    domain: "food",
    firstOrderOnly: true,
  },
  {
    code: "RADIUES20",
    description: "20% off, up to ₹60",
    kind: "percent",
    percentOff: 20,
    maxDiscountPaise: 6000,
    minOrderPaise: 20000,
    domain: "food",
    firstOrderOnly: false,
  },
  {
    code: "SAVE30",
    description: "₹30 off orders above ₹250",
    kind: "flat",
    valuePaise: 3000,
    minOrderPaise: 25000,
    domain: "food",
    firstOrderOnly: false,
  },
] as const;

export async function seedDemoCoupons(): Promise<number> {
  for (const c of DEMO_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        description: c.description,
        kind: c.kind,
        percentOff: "percentOff" in c ? c.percentOff : null,
        valuePaise: "valuePaise" in c ? c.valuePaise : null,
        maxDiscountPaise: "maxDiscountPaise" in c ? c.maxDiscountPaise : null,
        minOrderPaise: c.minOrderPaise,
        domain: c.domain,
        firstOrderOnly: c.firstOrderOnly,
      },
      update: {
        description: c.description,
        kind: c.kind,
        percentOff: "percentOff" in c ? c.percentOff : null,
        valuePaise: "valuePaise" in c ? c.valuePaise : null,
        maxDiscountPaise: "maxDiscountPaise" in c ? c.maxDiscountPaise : null,
        minOrderPaise: c.minOrderPaise,
        domain: c.domain,
        firstOrderOnly: c.firstOrderOnly,
      },
    });
  }
  return DEMO_COUPONS.length;
}
