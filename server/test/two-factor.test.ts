import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent, lastOtpFor } from "./helpers.js";

// Privacy & Security → Two-Factor Authentication. Email one-time code on top of
// the password, arming only after the mailbox is proved and disarming only
// against the account password.

const PASSWORD = "password123";

/** Turns the factor on for an already-signed-in agent. */
async function enable(agent: request.Agent, email: string) {
  await agent.post("/api/users/two-factor/start").expect(200);
  await agent
    .post("/api/users/two-factor/confirm")
    .send({ code: lastOtpFor(email) })
    .expect(200);
}

describe("two-factor authentication", () => {
  it("arms only after the emailed code is confirmed", async () => {
    const { agent, email } = await authedAgent();

    await agent.post("/api/users/two-factor/start").expect(200);
    // Still off until the code comes back.
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(false);

    await agent
      .post("/api/users/two-factor/confirm")
      .send({ code: lastOtpFor(email) })
      .expect(200);
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(true);
  });

  it("rejects a wrong code and leaves the factor off", async () => {
    const { agent } = await authedAgent();
    await agent.post("/api/users/two-factor/start").expect(200);
    await agent.post("/api/users/two-factor/confirm").send({ code: "000000" }).expect(401);
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(false);
  });

  it("login stops at the code step and issues no session until it is given", async () => {
    const { agent, email } = await authedAgent();
    await enable(agent, email);

    // A fresh client: password alone must not get in.
    const fresh = request.agent(app);
    const res = await fresh
      .post("/api/auth/login")
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(res.body.next).toBe("two-factor");
    expect(res.body.user).toBeUndefined();
    // No session was started, so an authenticated route is still closed.
    await fresh.get("/api/users/preferences").expect(401);

    const done = await fresh
      .post("/api/auth/login/verify")
      .send({ email, code: lastOtpFor(email) })
      .expect(200);
    expect(done.body.user.email).toBe(email);
    await fresh.get("/api/users/preferences").expect(200);
  });

  it("rejects a bad code at the second step", async () => {
    const { agent, email } = await authedAgent();
    await enable(agent, email);

    const fresh = request.agent(app);
    await fresh.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    await fresh
      .post("/api/auth/login/verify")
      .send({ email, code: "000000" })
      .expect(401);
    await fresh.get("/api/users/preferences").expect(401);
  });

  it("will not verify for an account that never turned the factor on", async () => {
    const { email } = await authedAgent();
    const fresh = request.agent(app);
    await fresh
      .post("/api/auth/login/verify")
      .send({ email, code: "123456" })
      .expect(401);
  });

  it("disabling needs the account password", async () => {
    const { agent, email } = await authedAgent();
    await enable(agent, email);

    await agent
      .post("/api/users/two-factor/disable")
      .send({ password: "wrong-password" })
      .expect(401);
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(true);

    await agent
      .post("/api/users/two-factor/disable")
      .send({ password: PASSWORD })
      .expect(200);
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(false);

    // And a plain password login works again.
    const fresh = request.agent(app);
    const res = await fresh
      .post("/api/auth/login")
      .send({ email, password: PASSWORD })
      .expect(200);
    expect(res.body.user.email).toBe(email);
  });

  it("cannot be started twice while already on", async () => {
    const { agent, email } = await authedAgent();
    await enable(agent, email);
    await agent.post("/api/users/two-factor/start").expect(409);
  });

  it("requires auth", async () => {
    await request(app).post("/api/users/two-factor/start").expect(401);
  });
});
