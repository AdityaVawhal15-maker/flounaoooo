import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("orders", () => {
  it("computes the amount server-side from the catalog", async () => {
    const { agent } = await authedAgent();
    // Client sends only ids — any "amount" field is rejected by strict zod.
    const res = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc", amount: 1 })
      .expect(201);
    // ONDC masala dosa: 12900 dish + 700 in-app convenience fee (free users,
    // waived for Radiues Plus) = 13600.
    expect(res.body.order.amount).toBe(13600);
    expect(res.body.order.status).toBe("pending_payment");
  });

  it("records savings vs the next-best platform", async () => {
    const { agent } = await authedAgent();
    // Dum biryani effective prices: ONDC ₹229, Zomato ₹259, Swiggy ₹268.
    const cheapest = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "dum-biryani", platform: "ondc" })
      .expect(201);
    expect(cheapest.body.order.savedPaise).toBe(3000); // ₹30 vs Zomato

    // Picking a pricier platform records zero savings — never a fake number.
    const pricier = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "dum-biryani", platform: "swiggy" })
      .expect(201);
    expect(pricier.body.order.savedPaise).toBe(0);
  });

  it("computes ride fare from coordinates server-side, ignoring client distance", async () => {
    const { agent } = await authedAgent();
    // Hitech City -> Airport, a long real trip. Client cannot send distanceKm.
    const ride = await agent
      .post("/api/orders")
      .send({
        domain: "ride",
        provider: "ondc",
        productName: "ONDC Auto",
        pickup: "Hitech City",
        drop: "Airport",
        pickupLat: 17.4435,
        pickupLng: 78.3772,
        dropLat: 17.2403,
        dropLng: 78.4294,
        // Even if an attacker injects these, they're stripped by the schema:
        distanceKm: 1,
        amount: 1,
      })
      .expect(201);
    // A ~30km auto ride costs far more than a faked 1km would.
    expect(ride.body.order.amount).toBeGreaterThan(20000);

    // Coordinates are persisted so the order screen can render a live map.
    const detail = await agent.get(`/api/orders/${ride.body.order.id}`).expect(200);
    expect(detail.body.order.details.pickupLat).toBeCloseTo(17.4435, 3);
    expect(detail.body.order.details.dropLng).toBeCloseTo(78.4294, 3);
  });

  it("rejects unknown dishes and ride products", async () => {
    const { agent } = await authedAgent();
    await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "free-caviar", platform: "ondc" })
      .expect(404);
    await agent
      .post("/api/orders")
      .send({
        domain: "ride",
        provider: "uber",
        productName: "Uber Helicopter",
        pickup: "A",
        drop: "B",
        pickupLat: 17.44,
        pickupLng: 78.37,
        dropLat: 17.24,
        dropLng: 78.42,
      })
      .expect(404);
  });

  it("hides other users' orders", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    const order = await a.agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    await b.agent.get(`/api/orders/${order.body.order.id}`).expect(404);
  });
});

describe("budget guardian", () => {
  it("tracks weekly food spend against the saved budget", async () => {
    const { agent } = await authedAgent();

    // No budget set yet
    let res = await agent.get("/api/users/budget").expect(200);
    expect(res.body.budgetPaise).toBeNull();

    await agent.put("/api/users/budget").send({ weeklyBudgetRupees: 500 }).expect(200);

    // Pay for an order (₹129 masala dosa on ONDC) so it counts as spend
    const order = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    await agent
      .post("/api/payments/checkout")
      .send({ orderId: order.body.order.id })
      .expect(200);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId: order.body.order.id, method: "upi" })
      .expect(200);

    res = await agent.get("/api/users/budget").expect(200);
    expect(res.body.budgetPaise).toBe(50000);
    // 12900 dish + 700 convenience fee (free user).
    expect(res.body.spentPaise).toBe(13600);
    expect(res.body.remainingPaise).toBe(36400);
  });

  it("rejects nonsense budget values", async () => {
    const { agent } = await authedAgent();
    await agent.put("/api/users/budget").send({ weeklyBudgetRupees: 5 }).expect(400);
    await agent.put("/api/users/budget").send({ weeklyBudgetRupees: -100 }).expect(400);
  });
});

// Builds a Cashfree-style webhook signed with a (by default fresh) epoch-second
// timestamp, so tests can vary amount and timestamp independently.
function signedWebhook(opts: {
  orderId: string;
  amountRupees: number;
  timestampSec?: number;
}) {
  const body = JSON.stringify({
    type: "PAYMENT_SUCCESS_WEBHOOK",
    data: {
      order: { order_id: opts.orderId, order_amount: opts.amountRupees },
      payment: {
        payment_status: "SUCCESS",
        payment_group: "upi",
        payment_amount: opts.amountRupees,
      },
    },
  });
  const timestamp = String(opts.timestampSec ?? Math.floor(Date.now() / 1000));
  const signature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
    .update(timestamp + body)
    .digest("base64");
  return { body, timestamp, signature };
}

// agent is a supertest agent from authedAgent(); kept loosely typed for tests.
async function freshPaidOrder(
  agent: { post: (url: string) => ReturnType<typeof request> },
  dishId = "dum-biryani",
) {
  const order = await agent
    .post("/api/orders")
    .send({ domain: "food", dishId, platform: "ondc" })
    .expect(201);
  const orderId = order.body.order.id as string;
  const amount = order.body.order.amount as number;
  await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
  return { orderId, amount };
}

describe("payments", () => {
  it("rejects unsigned webhooks", async () => {
    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .send({ type: "PAYMENT_SUCCESS_WEBHOOK", data: {} })
      .expect(401);
  });

  it("accepts a correctly signed webhook and confirms the order", async () => {
    const { agent } = await authedAgent();
    const { orderId, amount } = await freshPaidOrder(agent);

    const { body, timestamp, signature } = signedWebhook({
      orderId,
      amountRupees: amount / 100,
    });

    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", timestamp)
      .send(JSON.parse(body))
      .expect(200);

    const status = await agent.get(`/api/payments/status/${orderId}`).expect(200);
    expect(status.body.orderStatus).toBe("confirmed");
    expect(status.body.payment.status).toBe("success");
  });

  it("a webhook arriving before checkout still writes payment + timeline atomically", async () => {
    // Regression: the status claim used to commit before the payment/tracking
    // transaction, so a webhook for an order with no payment row (checkout
    // never called) left the order "confirmed" with no payment and no tracking
    // events — and tracking then fell back to createdAt, breaking scheduled
    // rides. Claim + payment upsert + events now share one transaction.
    const { agent } = await authedAgent();
    const created = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "dum-biryani", platform: "ondc" })
      .expect(201);
    const orderId = created.body.order.id as string;
    const amount = created.body.order.amount as number;
    // NOTE: no /payments/checkout call — no Payment row exists yet.

    const { body, timestamp, signature } = signedWebhook({
      orderId,
      amountRupees: amount / 100,
    });
    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", timestamp)
      .send(JSON.parse(body))
      .expect(200);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, trackingEvents: true },
    });
    expect(order?.status).toBe("confirmed");
    expect(order?.payment?.status).toBe("success"); // upserted, not missing
    expect(order?.payment?.amount).toBe(amount);
    expect(order?.trackingEvents.length).toBeGreaterThan(0); // timeline written
  });

  it("does NOT confirm an order when the paid amount is too low (C1)", async () => {
    const { agent } = await authedAgent();
    const { orderId, amount } = await freshPaidOrder(agent);

    // Sign a webhook claiming only ₹1 was paid for a ₹200+ order.
    const { body, timestamp, signature } = signedWebhook({
      orderId,
      amountRupees: 1,
    });

    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", timestamp)
      .send(JSON.parse(body))
      .expect(200); // we accept the delivery but must NOT confirm

    const status = await agent.get(`/api/payments/status/${orderId}`).expect(200);
    expect(status.body.orderStatus).toBe("pending_payment"); // unchanged
    expect(status.body.payment.status).toBe("failed");
    expect(amount).toBeGreaterThan(100);
  });

  it("rejects a stale (replayed) webhook timestamp (C2)", async () => {
    const { agent } = await authedAgent();
    const { orderId, amount } = await freshPaidOrder(agent);

    // Timestamp 10 minutes in the past — still correctly signed.
    const staleTs = Math.floor(Date.now() / 1000) - 600;
    const { body, timestamp, signature } = signedWebhook({
      orderId,
      amountRupees: amount / 100,
      timestampSec: staleTs,
    });

    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", timestamp)
      .send(JSON.parse(body))
      .expect(401); // stale → invalid signature path

    const status = await agent.get(`/api/payments/status/${orderId}`).expect(200);
    expect(status.body.orderStatus).toBe("pending_payment");
  });

  it("blocks paying someone else's order", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    const order = await a.agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    await b.agent
      .post("/api/payments/checkout")
      .send({ orderId: order.body.order.id })
      .expect(404);
  });

  it("confirms exactly once under concurrent payment callbacks", async () => {
    const { agent } = await authedAgent();
    const { orderId } = await freshPaidOrder(agent);

    // Fire two payment confirmations at the same time. The atomic status claim
    // means only the first wins; the second must no-op rather than double-fire
    // the tracking events.
    await Promise.all([
      agent.post("/api/payments/simulate").send({ orderId, method: "upi" }),
      agent.post("/api/payments/simulate").send({ orderId, method: "upi" }),
    ]);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("confirmed");

    // Tracking events were created once, not duplicated.
    const events = await prisma.trackingEvent.count({ where: { orderId } });
    const expected = order.domain === "food" ? FOOD_EVENT_COUNT : RIDE_EVENT_COUNT;
    expect(events).toBe(expected);

    // And a single successful payment row.
    const payments = await prisma.payment.count({
      where: { orderId, status: "success" },
    });
    expect(payments).toBe(1);
  });
});

// Tracking-event counts the payment flow seeds per domain (kept in sync with
// FOOD_EVENTS / RIDE_EVENTS in payments.routes.ts).
const FOOD_EVENT_COUNT = 4;
const RIDE_EVENT_COUNT = 3;
