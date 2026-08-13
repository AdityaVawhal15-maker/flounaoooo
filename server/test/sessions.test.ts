import { describe, expect, it } from "vitest";
import { app, authedAgent } from "./helpers.js";
import request from "supertest";

// Login activity (Privacy & Security → Login Activity).
//
// The regression these guard: revoke-others originally lived beside the other
// user endpoints, where the refresh cookie is never sent — it is deliberately
// scoped to /api/auth for CSRF defence. With no cookie to compare against, the
// handler couldn't identify the caller's own session and revoked every session
// including theirs, silently signing the user out of the device they pressed it
// on. It now lives on the auth router, so the cookie is present.

describe("login activity", () => {
  it("lists the caller's active sessions", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/sessions").expect(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  it("revokes other sessions but keeps the current one alive", async () => {
    const { agent, email } = await authedAgent();

    // A second, independent session for the same account. The password is the
    // one authedAgent signs up with.
    const other = request.agent(app);
    await other
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect(200);

    const before = await agent.get("/api/users/sessions").expect(200);
    expect(before.body.count).toBe(2);

    const res = await agent
      .post("/api/auth/sessions/revoke-others")
      .expect(200);
    expect(res.body.revoked).toBe(1);

    // The caller keeps working...
    const after = await agent.get("/api/users/sessions").expect(200);
    expect(after.body.count).toBe(1);

    // ...and the other session's refresh is genuinely dead.
    await other.post("/api/auth/refresh").expect(401);
  });

  it("requires authentication", async () => {
    await request(app).post("/api/auth/sessions/revoke-others").expect(401);
    await request(app).get("/api/users/sessions").expect(401);
  });
});
