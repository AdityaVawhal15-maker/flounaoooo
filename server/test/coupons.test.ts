import { beforeAll, describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Promo codes. The discount is always recomputed server-side — a client can
// only ever send a code string, never an amount.

async function makeCoupon(overrides: Record<string, unknown> = {}) {
  const code = `T${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  return prisma.coupon.create({
    data: {
      code,
      description: "Test code",
      kind: "flat",
      valuePaise: 5000,
      minOrderPaise: 0,
      domain: "food",
      ...overrides,
    },
  });
}

describe("promo codes", () => {
  beforeAll(async () => {
    const { seedDemoCoupons } = await import("../src/data/coupons.js");
    await seedDemoCoupons();
  });

  it("lists offered codes and validates a good one", async () => {
    const { agent } = await authedAgent();
    const list = await agent.get("/api/coupons?domain=food").expect(200);
    expect(list.body.coupons.length).toBeGreaterThan(0);

    const c = await makeCoupon({ valuePaise: 4000 });
    const res = await agent
      .post("/api/coupons/validate")
      .send({ code: c.code.toLowerCase(), domain: "food", subtotalPaise: 30000 })
      .expect(200);
    expect(res.body.discountPaise).toBe(4000); // lowercase input still matches
  });

  it("caps a percent coupon at its maximum", async () => {
    const { agent } = await authedAgent();
    const c = await makeCoupon({
      kind: "percent",
      percentOff: 50,
      valuePaise: null,
      maxDiscountPaise: 6000,
    });
    const res = await agent
      .post("/api/coupons/validate")
      .send({ code: c.code, domain: "food", subtotalPaise: 100000 }) // 50% = ₹500
      .expect(200);
    expect(res.body.discountPaise).toBe(6000); // capped at ₹60
  });

  it("rejects below-minimum, expired, wrong-domain and unknown codes", async () => {
    const { agent } = await authedAgent();

    const min = await makeCoupon({ minOrderPaise: 50000 });
    await agent
      .post("/api/coupons/validate")
      .send({ code: min.code, domain: "food", subtotalPaise: 10000 })
      .expect(400);

    const expired = await makeCoupon({ expiresAt: new Date(Date.now() - 1000) });
    await agent
      .post("/api/coupons/validate")
      .send({ code: expired.code, domain: "food", subtotalPaise: 30000 })
      .expect(400);

    const rideOnly = await makeCoupon({ domain: "ride" });
    await agent
      .post("/api/coupons/validate")
      .send({ code: rideOnly.code, domain: "food", subtotalPaise: 30000 })
      .expect(400);

    await agent
      .post("/api/coupons/validate")
      .send({ code: "NOSUCHCODE", domain: "food", subtotalPaise: 30000 })
      .expect(400);
  });

  it("applies the discount to the order total and records the redemption", async () => {
    const { agent } = await authedAgent();
    const c = await makeCoupon({ valuePaise: 3000 });

    const plain = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    const fullPrice = plain.body.order.amount as number;

    const discounted = await agent
      .post("/api/orders")
      .send({
        domain: "food",
        dishId: "masala-dosa",
        platform: "ondc",
        couponCode: c.code,
      })
      .expect(201);

    expect(discounted.body.order.amount).toBe(fullPrice - 3000);
    // The kept money counts towards lifetime savings.
    expect(discounted.body.order.savedPaise).toBe(
      (plain.body.order.savedPaise as number) + 3000,
    );

    const redemption = await prisma.couponRedemption.findUnique({
      where: { orderId: discounted.body.order.id },
    });
    expect(redemption?.discountPaise).toBe(3000);
    const after = await prisma.coupon.findUniqueOrThrow({ where: { id: c.id } });
    expect(after.usedCount).toBe(1);
  });

  it("can't be used twice by the same person", async () => {
    const { agent } = await authedAgent();
    const c = await makeCoupon();
    const body = {
      domain: "food",
      dishId: "masala-dosa",
      platform: "ondc",
      couponCode: c.code,
    };
    await agent.post("/api/orders").send(body).expect(201);
    const second = await agent.post("/api/orders").send(body).expect(400);
    expect(second.body.error).toMatch(/already used/i);
  });

  it("honours a total usage limit across users", async () => {
    const c = await makeCoupon({ usageLimit: 1 });
    const first = await authedAgent();
    await first.agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc", couponCode: c.code })
      .expect(201);

    const second = await authedAgent();
    const res = await second.agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc", couponCode: c.code })
      .expect(400);
    expect(res.body.error).toMatch(/fully claimed/i);
  });

  it("first-order codes are refused once someone has ordered before", async () => {
    const { agent } = await authedAgent();
    const c = await makeCoupon({ firstOrderOnly: true });

    // Place and pay for one order so the account is no longer 'first order'.
    const placed = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId: placed.body.order.id, method: "upi" })
      .expect(200);

    await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc", couponCode: c.code })
      .expect(400);
  });

  it("never lets a client dictate the discount amount", async () => {
    const { agent } = await authedAgent();
    const c = await makeCoupon({ valuePaise: 2000 });
    const res = await agent
      .post("/api/orders")
      .send({
        domain: "food",
        dishId: "masala-dosa",
        platform: "ondc",
        couponCode: c.code,
        // All of these are ignored by the schema / server pricing.
        discountPaise: 999999,
        amount: 1,
        savedPaise: 999999,
      })
      .expect(201);
    const redemption = await prisma.couponRedemption.findUnique({
      where: { orderId: res.body.order.id },
    });
    expect(redemption?.discountPaise).toBe(2000);
    expect(res.body.order.amount).toBeGreaterThan(1);
  });
});
