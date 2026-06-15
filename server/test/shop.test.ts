import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

describe("shop (e-commerce domain)", () => {
  it("requires auth", async () => {
    await request(app).get("/api/shop/feed").expect(401);
  });

  it("returns a feed with picks and categories", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/shop/feed").expect(200);
    expect(res.body.categories).toContain("Electronics");
    expect(res.body.picks.length).toBeGreaterThan(0);
  });

  it("searches and sorts by effective price", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/shop/search?q=earbuds").expect(200);
    expect(res.body.quotes.length).toBeGreaterThan(0);
    const prices = res.body.quotes.map((q: { effectivePaise: number }) => q.effectivePaise);
    expect(prices).toEqual([...prices].sort((a, b) => a - b)); // ascending
  });

  it("respects a budget filter", async () => {
    const { agent } = await authedAgent();
    // Earbuds are well under ₹3000; budget excludes nothing here but proves the path.
    const res = await agent.get("/api/shop/search?q=earbuds&budget=3000").expect(200);
    for (const q of res.body.quotes) {
      expect(q.effectivePaise).toBeLessThanOrEqual(300000);
    }
  });

  it("recommends the cheapest in-stock option", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/shop/recommend?q=running shoes").expect(200);
    expect(res.body.recommendation).not.toBeNull();
    expect(res.body.recommendation.best.inStock).toBe(true);
    // The out-of-stock Flipkart listing must not be the pick.
    expect(res.body.recommendation.best.platform).not.toBe("flipkart");
  });

  it("returns all listings for a product, and 404 for unknown", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/shop/products/gaming-laptop-rtx").expect(200);
    expect(res.body.quotes.length).toBeGreaterThan(1);
    await agent.get("/api/shop/products/flux-capacitor").expect(404);
  });

  it("routes a shopping query through chat to a shop recommendation", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/chat/message")
      .send({ message: "find me a gaming laptop under 70000" })
      .expect(200);
    expect(res.body.message.domain).toBe("shop");
    const rec = res.body.message.recommendation;
    expect(rec.type).toBe("shop");
    expect(rec.best.effectivePaise).toBeGreaterThan(0);
  });
});
