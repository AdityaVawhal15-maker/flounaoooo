import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

describe("notifications", () => {
  it("reports VAPID availability without auth", async () => {
    const res = await request(app).get("/api/notifications/vapid").expect(200);
    expect(res.body).toHaveProperty("enabled");
    expect(res.body).toHaveProperty("publicKey");
  });

  it("requires auth to subscribe", async () => {
    await request(app)
      .post("/api/notifications/subscribe")
      .send({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { p256dh: "key", auth: "secret" },
      })
      .expect(401);
  });

  it("stores and removes a subscription, idempotently", async () => {
    const { agent } = await authedAgent();
    const sub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
      keys: { p256dh: "p256dh-key", auth: "auth-secret" },
    };

    await agent.post("/api/notifications/subscribe").send(sub).expect(201);
    // Re-subscribing the same endpoint is an upsert, not a duplicate/error.
    await agent.post("/api/notifications/subscribe").send(sub).expect(201);
    await agent
      .post("/api/notifications/unsubscribe")
      .send({ endpoint: sub.endpoint })
      .expect(200);
  });

  it("rejects malformed subscriptions", async () => {
    const { agent } = await authedAgent();
    await agent
      .post("/api/notifications/subscribe")
      .send({ endpoint: "not-a-url", keys: { p256dh: "x", auth: "y" } })
      .expect(400);
  });

  it("rejects push endpoints from untrusted hosts (L1)", async () => {
    const { agent } = await authedAgent();
    await agent
      .post("/api/notifications/subscribe")
      .send({
        endpoint: "https://evil.attacker.com/steal",
        keys: { p256dh: "x", auth: "y" },
      })
      .expect(400);
  });
});
