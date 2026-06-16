import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";

// The savings insights endpoint: lifetime total + 6-week trend + food/ride
// split, all derived from paid orders.

async function payFood(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  dishId: string,
  platform: string,
) {
  const o = await agent
    .post("/api/orders")
    .send({ domain: "food", dishId, platform })
    .expect(201);
  const orderId = o.body.order.id as string;
  await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
  await agent
    .post("/api/payments/simulate")
    .send({ orderId, method: "upi" })
    .expect(200);
  return o.body.order.savedPaise as number;
}

describe("savings insights", () => {
  it("returns an empty-but-shaped payload for a new user", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/savings").expect(200);
    expect(res.body.totalSavedPaise).toBe(0);
    expect(res.body.paidOrders).toBe(0);
    expect(res.body.byDomain).toEqual({ food: 0, ride: 0 });
    expect(Array.isArray(res.body.weekly)).toBe(true);
    expect(res.body.weekly).toHaveLength(6); // always 6 week buckets
  });

  it("aggregates lifetime savings and the food split", async () => {
    const { agent } = await authedAgent();
    // Dum biryani on ONDC saves ₹30 vs the next-best platform.
    const saved = await payFood(agent, "dum-biryani", "ondc");
    expect(saved).toBe(3000);

    const res = await agent.get("/api/users/savings").expect(200);
    expect(res.body.totalSavedPaise).toBe(3000);
    expect(res.body.paidOrders).toBe(1);
    expect(res.body.byDomain.food).toBe(3000);
    expect(res.body.byDomain.ride).toBe(0);
    // This week's bucket (the last one) carries the saving.
    expect(res.body.weekly[res.body.weekly.length - 1].savedPaise).toBe(3000);
  });
});
