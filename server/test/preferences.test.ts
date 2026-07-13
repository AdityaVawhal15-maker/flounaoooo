import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";

// Settings → notification preferences. Both flags default on, persist per
// user, and reject empty/invalid updates.

describe("user preferences", () => {
  it("defaults both preferences to true", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/preferences").expect(200);
    expect(res.body).toEqual({ emailUpdates: true, smartSuggestions: true });
  });

  it("persists a partial update and leaves the other flag untouched", async () => {
    const { agent } = await authedAgent();
    const put = await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: false })
      .expect(200);
    expect(put.body).toEqual({ emailUpdates: false, smartSuggestions: true });

    const res = await agent.get("/api/users/preferences").expect(200);
    expect(res.body).toEqual({ emailUpdates: false, smartSuggestions: true });
  });

  it("updates both flags together", async () => {
    const { agent } = await authedAgent();
    const put = await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: false, smartSuggestions: false })
      .expect(200);
    expect(put.body).toEqual({ emailUpdates: false, smartSuggestions: false });
  });

  it("rejects an empty update", async () => {
    const { agent } = await authedAgent();
    await agent.put("/api/users/preferences").send({}).expect(400);
  });

  it("rejects non-boolean values", async () => {
    const { agent } = await authedAgent();
    await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: "yes" })
      .expect(400);
  });

  it("is per-user: one user's opt-out does not affect another", async () => {
    const { agent: a } = await authedAgent();
    const { agent: b } = await authedAgent();
    await a.put("/api/users/preferences").send({ smartSuggestions: false }).expect(200);
    const res = await b.get("/api/users/preferences").expect(200);
    expect(res.body.smartSuggestions).toBe(true);
  });

  it("requires auth", async () => {
    await request(app).get("/api/users/preferences").expect(401);
  });
});
