import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

describe("Flouna Plus subscription", () => {
  it("reports inactive status with price and perks for a new user", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/subscription").expect(200);
    expect(res.body.active).toBe(false);
    expect(res.body.pricePaise).toBe(5000); // ₹50
    expect(Array.isArray(res.body.perks)).toBe(true);
    expect(res.body.perks.length).toBeGreaterThan(0);
  });

  it("activates and cancels Plus", async () => {
    const { agent } = await authedAgent();
    const sub = await agent.post("/api/subscription/subscribe").expect(200);
    expect(sub.body.status.active).toBe(true);
    expect(sub.body.status.until).toBeTruthy();

    const status = await agent.get("/api/subscription").expect(200);
    expect(status.body.active).toBe(true);

    const cancelled = await agent.post("/api/subscription/cancel").expect(200);
    expect(cancelled.body.active).toBe(false);
  });

  it("waives the in-app convenience fee for Plus members", async () => {
    const { agent } = await authedAgent();
    // Free user pays dish + ₹7 convenience fee.
    const free = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    expect(free.body.order.amount).toBe(13600);

    // After subscribing, the fee is waived.
    await agent.post("/api/subscription/subscribe").expect(200);
    const plus = await agent
      .post("/api/orders")
      .send({ domain: "food", dishId: "masala-dosa", platform: "ondc" })
      .expect(201);
    expect(plus.body.order.amount).toBe(12900);
  });

  it("requires auth", async () => {
    await request(app).get("/api/subscription").expect(401);
  });

  it("never activates Plus without a verified charge when Cashfree is configured", async () => {
    // Re-import the app in an isolated module graph with Cashfree fully
    // configured, so the paid path is in effect. Plus must NOT be granted —
    // checkout returns 503 until the verified mandate flow exists.
    await vi.resetModules();
    vi.stubEnv("CASHFREE_APP_ID", "test-app-id");
    vi.stubEnv("CASHFREE_SECRET_KEY", "test-secret");
    try {
      const freshHelpers = await import("./helpers.js");
      const { agent } = await freshHelpers.authedAgent();

      const res = await agent.post("/api/subscription/subscribe").expect(503);
      expect(res.body.error).toMatch(/not available/i);

      // And the user is still NOT Plus.
      const status = await agent.get("/api/subscription").expect(200);
      expect(status.body.active).toBe(false);
    } finally {
      vi.unstubAllEnvs();
      await vi.resetModules();
    }
  });
});
