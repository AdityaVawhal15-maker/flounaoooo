import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { blendRating } from "../src/modules/ratings/ratings.service.js";

// Post-delivery ratings, and the loop back into recommendations.

type Agent = Awaited<ReturnType<typeof authedAgent>>["agent"];

async function completedOrder(agent: Agent) {
  const placed = await agent
    .post("/api/orders")
    .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
    .expect(201);
  const orderId = placed.body.order.id as string;
  await agent
    .post("/api/payments/simulate")
    .send({ orderId, method: "upi" })
    .expect(200);
  // Tracking events are seeded into the future; pull them back so the order
  // reads as delivered.
  await prisma.trackingEvent.updateMany({
    where: { orderId },
    data: { createdAt: new Date(Date.now() - 60_000) },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "completed" } });
  return orderId;
}

describe("order ratings", () => {
  it("rejects rating an order that isn't finished yet", async () => {
    const { agent } = await authedAgent();
    const placed = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    const res = await agent
      .post(`/api/orders/${placed.body.order.id}/rate`)
      .send({ stars: 5 })
      .expect(409);
    expect(res.body.error).toMatch(/delivered/i);
  });

  it("accepts a rating on a completed order, once", async () => {
    const { agent } = await authedAgent();
    const orderId = await completedOrder(agent);

    const first = await agent
      .post(`/api/orders/${orderId}/rate`)
      .send({ stars: 4, comment: "Tasty" })
      .expect(201);
    expect(first.body.rating.stars).toBe(4);
    expect(first.body.rating.itemKey).toBe("masala-dosa");

    await agent.post(`/api/orders/${orderId}/rate`).send({ stars: 1 }).expect(409);
  });

  it("rejects out-of-range stars and someone else's order", async () => {
    const { agent } = await authedAgent();
    const orderId = await completedOrder(agent);
    await agent.post(`/api/orders/${orderId}/rate`).send({ stars: 6 }).expect(400);
    await agent.post(`/api/orders/${orderId}/rate`).send({ stars: 0 }).expect(400);

    const other = await authedAgent();
    await other.agent
      .post(`/api/orders/${orderId}/rate`)
      .send({ stars: 5 })
      .expect(404);
  });

  it("returns the rating with the order so the UI can show it", async () => {
    const { agent } = await authedAgent();
    const orderId = await completedOrder(agent);
    await agent.post(`/api/orders/${orderId}/rate`).send({ stars: 5 }).expect(201);
    const res = await agent.get(`/api/orders/${orderId}`).expect(200);
    expect(res.body.order.rating.stars).toBe(5);
  });

  it("blends community stars over the catalog baseline by confidence", () => {
    // No ratings → baseline untouched.
    expect(blendRating(4.4, undefined)).toBe(4.4);
    // A single 1-star barely moves a 4.4 baseline…
    const one = blendRating(4.4, { average: 1, count: 1 });
    expect(one).toBeLessThan(4.4);
    expect(one).toBeGreaterThan(4.0);
    // …but a consistent crowd does.
    const many = blendRating(4.4, { average: 2, count: 20 });
    expect(many).toBe(2);
  });

  it("real ratings reach the food surfaces", async () => {
    const { agent } = await authedAgent();
    const before = await agent.get("/api/food/dishes/masala-dosa").expect(200);
    const baseline = before.body.quotes[0].rating as number;

    // Genuine 1-star ratings on real completed orders (the rating table is
    // foreign-keyed to Order, which is exactly the integrity we want).
    for (let i = 0; i < 3; i++) {
      const orderId = await completedOrder(agent);
      await agent.post(`/api/orders/${orderId}/rate`).send({ stars: 1 }).expect(201);
    }

    const after = await agent.get("/api/food/dishes/masala-dosa").expect(200);
    expect(after.body.quotes[0].rating).toBeLessThan(baseline);
  });
});
