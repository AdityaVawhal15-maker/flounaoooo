import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { SimulationProvider } from "../src/modules/providers/simulation.provider.js";

const PICKUP = { lat: 17.4435, lng: 78.3772 };
const DROP = { lat: 17.385, lng: 78.4867 };
const GEOM: [number, number][] = [
  [PICKUP.lng, PICKUP.lat],
  [DROP.lng, DROP.lat],
];

describe("simulation provider", () => {
  const provider = new SimulationProvider();

  it("starts in 'searching' with no driver, then assigns one", async () => {
    const booked = await provider.book({
      orderId: "order-abc-123",
      provider: "ondc",
      vehicle: "auto",
      productName: "ONDC Auto",
      pickup: { ...PICKUP, label: "A" },
      drop: { ...DROP, label: "B" },
      routeGeometry: GEOM,
    });
    expect(booked.state).toBe("searching");
    expect(booked.driver).toBeNull();
    expect(booked.otp).toMatch(/^\d{4}$/);

    const bookedAt = new Date(Date.now() - 60_000); // 60s in
    const arriving = await provider.track({
      orderId: "order-abc-123",
      providerRef: booked.providerRef,
      vehicle: "auto",
      pickup: PICKUP,
      drop: DROP,
      routeGeometry: GEOM,
      bookedAt,
    });
    expect(arriving.state).toBe("arriving");
    expect(arriving.driver).not.toBeNull();
    expect(arriving.driver!.vehicle.type).toBe("auto");
    expect(arriving.driverLocation).not.toBeNull();
    // OTP is stable across polls for the same order.
    expect(arriving.otp).toBe(booked.otp);
  });

  it("is deterministic — same order yields the same driver", async () => {
    const a = await provider.track({
      orderId: "stable-1",
      providerRef: "x",
      vehicle: "cab",
      pickup: PICKUP,
      drop: DROP,
      routeGeometry: GEOM,
      bookedAt: new Date(Date.now() - 60_000),
    });
    const b = await provider.track({
      orderId: "stable-1",
      providerRef: "x",
      vehicle: "cab",
      pickup: PICKUP,
      drop: DROP,
      routeGeometry: GEOM,
      bookedAt: new Date(Date.now() - 60_000),
    });
    expect(a.driver!.name).toBe(b.driver!.name);
    expect(a.driver!.vehicle.plate).toBe(b.driver!.vehicle.plate);
    expect(a.otp).toBe(b.otp);
  });

  it("completes after the full trip duration", async () => {
    const done = await provider.track({
      orderId: "order-done",
      providerRef: "x",
      vehicle: "auto",
      pickup: PICKUP,
      drop: DROP,
      routeGeometry: GEOM,
      bookedAt: new Date(Date.now() - 60 * 60_000), // an hour ago
    });
    expect(done.state).toBe("completed");
  });

  it("never leaks a raw phone number", async () => {
    const t = await provider.track({
      orderId: "order-phone",
      providerRef: "x",
      vehicle: "bike",
      pickup: PICKUP,
      drop: DROP,
      routeGeometry: GEOM,
      bookedAt: new Date(Date.now() - 60_000),
    });
    expect(t.driver!.phoneMasked).toContain("●");
  });
});

describe("ride tracking endpoint", () => {
  async function bookAndPay(
    agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  ) {
    const ride = await agent
      .post("/api/orders")
      .send({
        domain: "ride",
        provider: "ondc",
        productName: "ONDC Auto",
        pickup: "Hitech City",
        drop: "Charminar",
        pickupLat: PICKUP.lat,
        pickupLng: PICKUP.lng,
        dropLat: DROP.lat,
        dropLng: DROP.lng,
      })
      .expect(201);
    const orderId = ride.body.order.id as string;
    await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId, method: "upi" })
      .expect(200);
    return orderId;
  }

  it("returns a live assignment for a confirmed ride", async () => {
    const { agent } = await authedAgent();
    const orderId = await bookAndPay(agent);
    const res = await agent.get(`/api/orders/${orderId}/track`).expect(200);
    expect(res.body.tracking).toBeTruthy();
    expect(res.body.tracking.otp).toMatch(/^\d{4}$/);
    expect(["searching", "arriving", "arrived", "in_progress", "completed"]).toContain(
      res.body.tracking.state,
    );
  });

  it("rejects tracking a food order", async () => {
    const { agent } = await authedAgent();
    const food = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    const orderId = food.body.order.id as string;
    await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId, method: "upi" })
      .expect(200);
    await agent.get(`/api/orders/${orderId}/track`).expect(400);
  });

  it("404s for someone else's order", async () => {
    const { agent: a } = await authedAgent();
    const orderId = await bookAndPay(a);
    const { agent: b } = await authedAgent();
    await b.get(`/api/orders/${orderId}/track`).expect(404);
  });

  it("cancels a confirmed ride and reports a cancelled state", async () => {
    const { agent } = await authedAgent();
    const orderId = await bookAndPay(agent);

    const res = await agent
      .post(`/api/orders/${orderId}/cancel`)
      .send({ reason: "changed my mind" })
      .expect(200);
    expect(res.body.order.status).toBe("cancelled");

    // Tracking now reports the terminal cancelled state.
    const track = await agent.get(`/api/orders/${orderId}/track`).expect(200);
    expect(track.body.tracking.state).toBe("cancelled");
  });

  it("won't cancel a ride twice", async () => {
    const { agent } = await authedAgent();
    const orderId = await bookAndPay(agent);
    await agent.post(`/api/orders/${orderId}/cancel`).send({}).expect(200);
    await agent.post(`/api/orders/${orderId}/cancel`).send({}).expect(409);
  });

  it("won't cancel a food order via the ride endpoint", async () => {
    const { agent } = await authedAgent();
    const food = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    await agent
      .post(`/api/orders/${food.body.order.id}/cancel`)
      .send({})
      .expect(400);
  });

  it("won't let someone cancel another user's ride", async () => {
    const { agent: a } = await authedAgent();
    const orderId = await bookAndPay(a);
    const { agent: b } = await authedAgent();
    await b.post(`/api/orders/${orderId}/cancel`).send({}).expect(404);
  });
});
