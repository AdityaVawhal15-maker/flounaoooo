import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { checkPriceAlerts } from "../src/modules/alerts/alerts.service.js";

describe("price alerts", () => {
  it("requires auth", async () => {
    const { default: request } = await import("supertest");
    const { app } = await import("./helpers.js");
    await request(app).get("/api/alerts").expect(401);
  });

  it("creates an alert with a server-trusted item name", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/alerts")
      .send({ domain: "food", itemKey: "dum-biryani", targetRupees: 150 })
      .expect(201);
    expect(res.body.alert.itemName).toBe("Dum Biryani");
    expect(res.body.alert.targetPaise).toBe(15000);
    expect(res.body.alert.active).toBe(true);
  });

  it("rejects an unknown item", async () => {
    const { agent } = await authedAgent();
    await agent
      .post("/api/alerts")
      .send({ domain: "food", itemKey: "free-lunch", targetRupees: 100 })
      .expect(404);
  });

  it("triggers when an observed price drops to/below target, then deactivates", async () => {
    const { agent } = await authedAgent();
    // Target ₹150 for masala dosa.
    const created = await agent
      .post("/api/alerts")
      .send({ domain: "food", itemKey: "masala-dosa", targetRupees: 150 })
      .expect(201);
    const alertId = created.body.alert.id as string;

    // Seed an observation BELOW the target (₹120).
    await prisma.priceObservation.create({
      data: { domain: "food", key: "masala-dosa", hour: 12, weekday: 0, bestPaise: 12000 },
    });

    const triggered = await checkPriceAlerts();
    expect(triggered).toBeGreaterThanOrEqual(1);

    const after = await prisma.priceAlert.findUnique({ where: { id: alertId } });
    expect(after?.active).toBe(false);
    expect(after?.triggeredAt).not.toBeNull();
    expect(after?.lastSeenPaise).toBe(12000);
  });

  it("does NOT trigger when the price is above target", async () => {
    const { agent } = await authedAgent();
    const created = await agent
      .post("/api/alerts")
      .send({ domain: "food", itemKey: "chocolate-cake", targetRupees: 50 })
      .expect(201);
    const alertId = created.body.alert.id as string;

    // Observation ABOVE target (₹99).
    await prisma.priceObservation.create({
      data: { domain: "food", key: "chocolate-cake", hour: 12, weekday: 0, bestPaise: 9900 },
    });

    await checkPriceAlerts();
    const after = await prisma.priceAlert.findUnique({ where: { id: alertId } });
    expect(after?.active).toBe(true); // still watching
  });

  it("lets a user delete only their own alert", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    const created = await a.agent
      .post("/api/alerts")
      .send({ domain: "food", itemKey: "veg-thali", targetRupees: 100 })
      .expect(201);
    const alertId = created.body.alert.id as string;

    await b.agent.delete(`/api/alerts/${alertId}`).expect(404); // not theirs
    await a.agent.delete(`/api/alerts/${alertId}`).expect(204); // owner
  });
});
