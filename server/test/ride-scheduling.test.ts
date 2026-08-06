import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Ride scheduling: "book a cab at 10pm" carries a schedule through chat, the
// order stores it, and the tracking timeline anchors at the scheduled time.

const RIDE_BODY = {
  domain: "ride" as const,
  provider: "ondc" as const,
  productName: "ONDC Cab",
  pickup: "Home",
  drop: "Airport",
  pickupLat: 17.385,
  pickupLng: 78.4867,
  dropLat: 17.24,
  dropLng: 78.4294,
};

async function bookRide(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  extra: Record<string, unknown> = {},
) {
  const res = await agent.post("/api/orders").send({ ...RIDE_BODY, ...extra });
  return res;
}

describe("ride scheduling", () => {
  it("chat parses 'at 10pm' into a future scheduledAt on the ride recommendation", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/chat/message")
      .send({ message: "book a cab to the airport at 10pm" })
      .expect(200);
    const rec = res.body.message.recommendation;
    expect(rec.type).toBe("ride");
    expect(rec.scheduledAt).toBeTruthy();
    const when = new Date(rec.scheduledAt);
    expect(when.getTime()).toBeGreaterThan(Date.now());
    expect(when.getHours()).toBe(22);
    // The time phrase must not leak into the destination.
    expect(rec.drop.toLowerCase()).not.toContain("10pm");
    expect(res.body.message.recommendation.why).toContain("scheduled");
  });

  it("chat parses 'at 10pm' into scheduledAt for combo intent ride recommendation", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/chat/message")
      .send({ message: "order biryani and book a cab to the airport at 10pm" })
      .expect(200);
    const rec = res.body.message.recommendation;
    expect(rec.type).toBe("combo");
    expect(rec.ride.scheduledAt).toBeTruthy();
    const when = new Date(rec.ride.scheduledAt);
    expect(when.getTime()).toBeGreaterThan(Date.now());
    expect(when.getHours()).toBe(22);
    expect(rec.ride.why).toContain("scheduled");
  });

  it("chat leaves scheduledAt empty for a ride-now request", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/chat/message")
      .send({ message: "book a cab to the airport" })
      .expect(200);
    expect(res.body.message.recommendation.scheduledAt).toBeNull();
  });

  it("stores scheduledAt on the order and anchors tracking events there", async () => {
    const { agent } = await authedAgent();
    const scheduledAt = new Date(Date.now() + 3 * 3600_000).toISOString();
    const created = await bookRide(agent, { scheduledAt });
    expect(created.status).toBe(201);
    const orderId = created.body.order.id as string;
    expect(JSON.parse(created.body.order.details).scheduledAt).toBe(scheduledAt);

    // Pay (simulated) → tracking timeline should start at the scheduled time.
    await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId, method: "upi" })
      .expect(200);

    const events = await prisma.trackingEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]!.createdAt.getTime()).toBe(Date.parse(scheduledAt));

    // Tracking reports the scheduled placeholder until that time arrives.
    const track = await agent.get(`/api/orders/${orderId}/track`).expect(200);
    expect(track.body.tracking.statusMessage).toContain("Ride scheduled for");
    expect(track.body.tracking.driver).toBeNull();
  });

  it("rejects a scheduled time in the past", async () => {
    const { agent } = await authedAgent();
    const res = await bookRide(agent, {
      scheduledAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it("rejects a scheduled time more than 7 days out", async () => {
    const { agent } = await authedAgent();
    const res = await bookRide(agent, {
      scheduledAt: new Date(Date.now() + 8 * 24 * 3600_000).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it("an unscheduled ride still starts its timeline immediately", async () => {
    const { agent } = await authedAgent();
    const created = await bookRide(agent);
    expect(created.status).toBe(201);
    const orderId = created.body.order.id as string;
    await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
    await agent
      .post("/api/payments/simulate")
      .send({ orderId, method: "upi" })
      .expect(200);
    const events = await prisma.trackingEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    // First event is "now" (within a small tolerance), not in the far future.
    expect(Math.abs(events[0]!.createdAt.getTime() - Date.now())).toBeLessThan(10_000);
  });
});
