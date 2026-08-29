import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent, lastOtpFor } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Adversarial pass over the Privacy & Security surface. Every test here is
// written as the attack, not the happy path: cross-account access, id
// guessing, factor bypass, code reuse across purposes, and enumeration.

const PASSWORD = "password123";

async function enable2fa(agent: request.Agent, email: string) {
  await agent.post("/api/users/two-factor/start").expect(200);
  await agent
    .post("/api/users/two-factor/confirm")
    .send({ code: lastOtpFor(email) })
    .expect(200);
}

describe("cross-account access is refused", () => {
  it("cannot end someone else's session by guessing its id", async () => {
    const victim = await authedAgent();
    const attacker = await authedAgent();

    const list = await victim.agent.get("/api/users/sessions").expect(200);
    const victimSessionId = list.body.sessions[0].id as string;

    await attacker.agent.delete(`/api/auth/sessions/${victimSessionId}`).expect(404);

    // The victim's session is untouched and still works.
    await victim.agent.get("/api/users/preferences").expect(200);
    const token = await prisma.refreshToken.findUnique({
      where: { id: victimSessionId },
      select: { revokedAt: true },
    });
    expect(token?.revokedAt).toBeNull();
  });

  it("cannot delete someone else's block by id", async () => {
    const victim = await authedAgent();
    const attacker = await authedAgent();
    const target = await authedAgent();

    const created = await victim.agent
      .post("/api/users/blocked")
      .send({ email: target.email })
      .expect(201);

    await attacker.agent
      .delete(`/api/users/blocked/${created.body.blocked.id}`)
      .expect(404);
    expect((await victim.agent.get("/api/users/blocked").expect(200)).body.blocked)
      .toHaveLength(1);
  });

  it("cannot read or clear another account's device locks", async () => {
    const victim = await authedAgent();
    const attacker = await authedAgent();

    await victim.agent
      .post("/api/users/device-locks")
      .send({ credentialId: "victim-credential-0001" })
      .expect(201);

    expect((await attacker.agent.get("/api/users/device-locks").expect(200)).body.locks)
      .toHaveLength(0);
    // A blanket delete only ever clears the caller's own rows.
    await attacker.agent.delete("/api/users/device-locks").expect(200);
    expect((await victim.agent.get("/api/users/device-locks").expect(200)).body.locks)
      .toHaveLength(1);
  });

  it("claiming a credential id another account registered does not leak it", async () => {
    const victim = await authedAgent();
    const attacker = await authedAgent();
    const credentialId = "shared-credential-id-42";

    await victim.agent
      .post("/api/users/device-locks")
      .send({ credentialId, label: "Victim's laptop" })
      .expect(201);

    // Re-posting someone else's credential must not return their row and must
    // not silently succeed as if the attacker now owns the lock.
    const res = await attacker.agent
      .post("/api/users/device-locks")
      .send({ credentialId });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toContain("Victim's laptop");

    // And the attacker's own lock state is still off.
    expect((await attacker.agent.get("/api/users/preferences").expect(200)).body.biometricLock)
      .toBe(false);
  });
});

describe("two-factor cannot be bypassed", () => {
  it("a code minted for console step-up does not satisfy a user login", async () => {
    // Purpose separation: codes are scoped to what they were issued for, so a
    // code obtained through one flow can't be spent on another.
    const { agent, email } = await authedAgent();
    await enable2fa(agent, email);

    await prisma.user.update({ where: { email }, data: { role: "admin" } });
    const fresh = request.agent(app);
    // Ask the console flow for a step-up code...
    await fresh.post("/api/auth/console/login").send({ email, password: PASSWORD }).expect(200);
    const consoleCode = lastOtpFor(email);

    // ...and try to spend it on the ordinary login's second factor.
    await fresh.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    await fresh
      .post("/api/auth/login/verify")
      .send({ email, code: consoleCode })
      .expect(401);
  });

  it("a login code cannot be replayed a second time", async () => {
    const { agent, email } = await authedAgent();
    await enable2fa(agent, email);

    const first = request.agent(app);
    await first.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    const code = lastOtpFor(email);
    await first.post("/api/auth/login/verify").send({ email, code }).expect(200);

    // Same code, new client — must be spent.
    const second = request.agent(app);
    await second.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    await second.post("/api/auth/login/verify").send({ email, code }).expect(401);
    await second.get("/api/users/preferences").expect(401);
  });

  it("a wrong password never reaches the code step", async () => {
    const { agent, email } = await authedAgent();
    await enable2fa(agent, email);

    const attacker = request.agent(app);
    await attacker
      .post("/api/auth/login")
      .send({ email, password: "not-the-password" })
      .expect(401);
    // No code should have been issued for that attempt.
    await attacker
      .post("/api/auth/login/verify")
      .send({ email, code: "123456" })
      .expect(401);
  });

  it("guessing the code is capped, not unlimited", async () => {
    const { agent, email } = await authedAgent();
    await enable2fa(agent, email);

    const attacker = request.agent(app);
    await attacker.post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    const real = lastOtpFor(email);

    // Burn through the attempt allowance with wrong guesses.
    for (let i = 0; i < 6; i++) {
      await attacker.post("/api/auth/login/verify").send({ email, code: "000000" });
    }
    // The real code is now dead too — the attempt cap retires the code rather
    // than letting an attacker keep going until they land on it.
    await attacker.post("/api/auth/login/verify").send({ email, code: real }).expect(401);
  });

  it("turning the factor off needs the password, and a session alone is not enough", async () => {
    const { agent, email } = await authedAgent();
    await enable2fa(agent, email);
    // A stolen session cannot quietly remove the second factor.
    await agent.post("/api/users/two-factor/disable").send({ password: "" }).expect(400);
    await agent.post("/api/users/two-factor/disable").send({ password: "guess" }).expect(401);
    expect((await agent.get("/api/users/preferences").expect(200)).body.twoFactorEnabled)
      .toBe(true);
  });
});

describe("privacy settings cannot be set on someone else's behalf", () => {
  it("preferences writes only ever touch the caller", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    await a.agent
      .put("/api/users/preferences")
      .send({ profileVisibility: "nobody", activityStatus: false })
      .expect(200);
    const bPrefs = await b.agent.get("/api/users/preferences").expect(200);
    expect(bPrefs.body.profileVisibility).toBe("everyone");
    expect(bPrefs.body.activityStatus).toBe(true);
  });

  it("rejects unknown fields rather than silently ignoring them", async () => {
    const { agent, email } = await authedAgent();
    await agent.put("/api/users/preferences").send({ role: "admin" }).expect(400);
    // Smuggled alongside a legitimate field: still refused, and — the part that
    // actually matters — the privilege field is untouched either way.
    await agent
      .put("/api/users/preferences")
      .send({ profileVisibility: "everyone", role: "admin" })
      .expect(400);

    const after = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { role: true },
    });
    expect(after.role).toBe("user");
  });

  it("cannot escalate role or flip plus/budget through the profile endpoint", async () => {
    const { agent, email } = await authedAgent();
    await agent
      .patch("/api/users/me")
      .send({ name: "Attacker", role: "super_admin", plusActive: true })
      .expect(200);
    const after = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { role: true, plusActive: true, name: true },
    });
    expect(after.name).toBe("Attacker"); // the legitimate part applied
    expect(after.role).toBe("user"); // the smuggled parts did not
    expect(after.plusActive).toBe(false);
  });

  it("every endpoint on this surface requires a session", async () => {
    for (const [method, path] of [
      ["get", "/api/users/blocked"],
      ["post", "/api/users/blocked"],
      ["get", "/api/users/device-locks"],
      ["post", "/api/users/device-locks"],
      ["delete", "/api/users/device-locks"],
      ["post", "/api/users/two-factor/start"],
      ["post", "/api/users/two-factor/confirm"],
      ["post", "/api/users/two-factor/disable"],
      ["get", "/api/auth/sessions/current"],
    ] as const) {
      const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
        method
      ](path).send({});
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
    }
  });
});
