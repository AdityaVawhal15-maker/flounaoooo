import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

describe("orders", () => {
  it("computes the amount server-side from the catalog", async () => {
    const { agent } = await authedAgent();
    // Client sends only ids — any "amount" field is rejected by strict zod.
    const res = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc", amount: 1 })
      .expect(201);
    // ONDC masala dosa: 12900 + 1000 delivery - 1000 offer = 12900
    expect(res.body.order.amount).toBe(12900);
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
        distanceKm: 5,
        rideMinutes: 15,
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
    expect(res.body.spentPaise).toBe(12900);
    expect(res.body.remainingPaise).toBe(37100);
  });

  it("rejects nonsense budget values", async () => {
    const { agent } = await authedAgent();
    await agent.put("/api/users/budget").send({ weeklyBudgetRupees: 5 }).expect(400);
    await agent.put("/api/users/budget").send({ weeklyBudgetRupees: -100 }).expect(400);
  });
});

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
    const order = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "dum-biryani", platform: "ondc" })
      .expect(201);
    const orderId = order.body.order.id as string;

    // checkout creates the payment row (simulated mode — no APP_ID in test env)
    await agent.post("/api/payments/checkout").send({ orderId }).expect(200);

    const body = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: {
        order: { order_id: orderId },
        payment: { payment_status: "SUCCESS", payment_group: "upi" },
      },
    });
    const timestamp = String(Date.now());
    const signature = crypto
      .createHmac("sha256", process.env.CASHFREE_SECRET_KEY!)
      .update(timestamp + body)
      .digest("base64");

    await request(app)
      .post("/api/payments/webhook/cashfree")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .set("x-webhook-timestamp", timestamp)
      .send(JSON.parse(body)) // supertest re-serializes identically
      .expect(200);

    const status = await agent.get(`/api/payments/status/${orderId}`).expect(200);
    expect(status.body.orderStatus).toBe("confirmed");
    expect(status.body.payment.status).toBe("success");
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
});
