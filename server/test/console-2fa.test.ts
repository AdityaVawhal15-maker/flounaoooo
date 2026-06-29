import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent, lastOtpFor } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

describe("operator console 2FA (step-up)", () => {
  it("an operator must pass email OTP before the console opens", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });

    // Password step: correct creds return next=otp and do NOT start a session.
    const login = await agent
      .post("/api/auth/console/login")
      .send({ email, password: "password123" })
      .expect(200);
    expect(login.body.next).toBe("otp");

    // Without verifying, the console is blocked with the step-up signal.
    const blocked = await agent.get("/api/console/admin/analytics").expect(403);
    expect(blocked.body.code).toBe("step_up_required");

    // Verify the OTP → console opens.
    await agent
      .post("/api/auth/console/verify")
      .send({ email, code: lastOtpFor(email) })
      .expect(200);
    await agent.get("/api/console/admin/analytics").expect(200);
  });

  it("a wrong OTP is rejected and does not grant access", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "developer" } });
    await agent
      .post("/api/auth/console/login")
      .send({ email, password: "password123" })
      .expect(200);

    await agent
      .post("/api/auth/console/verify")
      .send({ email, code: "000000" })
      .expect(401);
    await agent.get("/api/console/dev/health").expect(403);
  });

  it("an ordinary user gets 404 from console login (surface hidden)", async () => {
    const { agent, email } = await authedAgent(); // role stays "user"
    await agent
      .post("/api/auth/console/login")
      .send({ email, password: "password123" })
      .expect(404);
  });

  it("wrong password never reaches the OTP step", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    await agent
      .post("/api/auth/console/login")
      .send({ email, password: "wrong-password" })
      .expect(401);
  });

  it("a plain consumer session (no step-up) cannot reach the console", async () => {
    // Sign in the ordinary way, THEN get promoted — the existing session has no
    // step claim, so the console stays closed until a fresh 2FA login.
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "super_admin" } });
    await agent.post("/api/auth/refresh").expect(200); // refresh, still no step-up
    const res = await agent.get("/api/console/super/operators").expect(403);
    expect(res.body.code).toBe("step_up_required");
  });

  it("step-up survives a token refresh", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    await agent.post("/api/auth/console/login").send({ email, password: "password123" }).expect(200);
    await agent.post("/api/auth/console/verify").send({ email, code: lastOtpFor(email) }).expect(200);

    // Rotate the session; the new access token must keep the step-up standing.
    await agent.post("/api/auth/refresh").expect(200);
    await agent.get("/api/console/admin/analytics").expect(200);
  });

  it("verify requires the account to still be an operator", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    await agent.post("/api/auth/console/login").send({ email, password: "password123" }).expect(200);

    // Role revoked between login and verify → verify refuses (404, hidden).
    await prisma.user.update({ where: { email }, data: { role: "user" } });
    await agent
      .post("/api/auth/console/verify")
      .send({ email, code: lastOtpFor(email) })
      .expect(404);
  });

  it("unauthenticated console verify with a bad payload is rejected", async () => {
    await request(app)
      .post("/api/auth/console/verify")
      .send({ email: "nobody@test.dev", code: "12" })
      .expect(400); // code must be 6 digits
  });

  it("whoami probe reflects step-up state for the console UI", async () => {
    const { agent, email } = await authedAgent();
    await prisma.user.update({ where: { email }, data: { role: "admin" } });

    // Before step-up: probe is blocked with the step-up signal.
    await agent.post("/api/auth/console/login").send({ email, password: "password123" }).expect(200);
    const before = await agent.get("/api/console/whoami").expect(403);
    expect(before.body.code).toBe("step_up_required");

    // After step-up: probe succeeds and reports the role.
    await agent.post("/api/auth/console/verify").send({ email, code: lastOtpFor(email) }).expect(200);
    const after = await agent.get("/api/console/whoami").expect(200);
    expect(after.body.role).toBe("admin");
  });
});
