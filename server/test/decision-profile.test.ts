import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";

// Helper: place + pay for an order so it counts toward the decision profile.
async function payFood(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  dishId: string,
  platform = "ondc",
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
}

async function payRide(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  drop: string,
) {
  const r = await agent
    .post("/api/orders")
    .send({
      domain: "ride",
      provider: "ondc",
      productName: "ONDC Auto",
      pickup: "Home",
      drop,
      pickupLat: 17.44,
      pickupLng: 78.37,
      dropLat: 17.38,
      dropLng: 78.48,
    })
    .expect(201);
  const orderId = r.body.order.id as string;
  await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
  await agent
    .post("/api/payments/simulate")
    .send({ orderId, method: "upi" })
    .expect(200);
}

describe("decision profile (memory)", () => {
  it("is empty and not confident for a new user", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/profile").expect(200);
    expect(res.body.orders).toBe(0);
    expect(res.body.confident).toBe(false);
    expect(res.body.taste.topDishes).toEqual([]);
    expect(res.body.spend.band).toBe("unknown");
  });

  it("learns top dishes and reorder habits from food orders", async () => {
    const { agent } = await authedAgent();
    await payFood(agent, "masala-dosa");
    await payFood(agent, "masala-dosa");
    await payFood(agent, "dum-biryani");

    const res = await agent.get("/api/users/profile").expect(200);
    expect(res.body.orders).toBe(3);
    expect(res.body.confident).toBe(true);
    // Masala Dosa ordered twice → top dish + a reorder habit.
    expect(res.body.taste.topDishes[0].count).toBe(2);
    expect(res.body.routines.reorderHabits.length).toBeGreaterThanOrEqual(1);
  });

  it("derives a spend band from order value", async () => {
    const { agent } = await authedAgent();
    // Margherita Pizza is a higher-priced dish → premium-ish band.
    await payFood(agent, "margherita-pizza");
    const res = await agent.get("/api/users/profile").expect(200);
    expect(["budget", "mid", "premium"]).toContain(res.body.spend.band);
    expect(res.body.spend.avgOrderPaise).toBeGreaterThan(0);
  });

  it("detects a recurring ride route as a routine", async () => {
    const { agent } = await authedAgent();
    await payRide(agent, "Office");
    await payRide(agent, "Office");

    const res = await agent.get("/api/users/profile").expect(200);
    const office = res.body.routines.recurringRides.find(
      (r: { drop: string }) => r.drop === "Office",
    );
    expect(office).toBeTruthy();
    expect(office.count).toBe(2);
    expect(typeof office.typicalHour).toBe("number");
  });

  it("requires authentication", async () => {
    const { app } = await import("./helpers.js");
    const request = (await import("supertest")).default;
    await request(app).get("/api/users/profile").expect(401);
  });
});
