// Data-subject rights: export, erasure, cookie choice, training opt-out.
//
// These are legal rights with published deadlines, so the tests are about the
// ways they could fail quietly: an export that leaks credentials, an erasure
// that leaves the person findable, a deletion anyone holding a phone could
// trigger, a cookie toggle that reports success and saves nothing.

import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { eraseAccount, processDueDeletions } from "../src/modules/compliance/privacy.service.js";
import { DELETION_GRACE_MS, PRIVACY_REQUEST_SLA } from "../src/lib/policy.js";

describe("a copy of your data", () => {
  it("returns the account as a downloadable file", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/privacy/export").expect(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename=/);
    const body = JSON.parse(res.text);
    expect(body.account.email).toMatch(/@test\.dev$/);
    expect(body).toHaveProperty("orders");
    expect(body).toHaveProperty("consentHistory");
    expect(body).toHaveProperty("addresses");
  });

  it("never includes credentials or session material", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/privacy/export").expect(200);

    // Checked against the whole serialised file rather than against the keys
    // we happen to know about. An export lands in a downloads folder and gets
    // mailed around; a password hash reaching one turns a privacy right into
    // the easiest credential theft we offer.
    const raw = res.text;
    expect(raw).not.toMatch(/passwordHash/);
    expect(raw).not.toMatch(/\$2[aby]\$/); // a bcrypt hash, however it is labelled
    expect(raw).not.toMatch(/refreshToken/i);
    expect(raw).not.toMatch(/tokenHash/);
    expect(raw).not.toMatch(/credentialId/);
    expect(raw).not.toMatch(/gatewayResponse/);
  });

  it("records the request against the published deadline", async () => {
    const { agent, email } = await authedAgent();
    await agent.get("/api/privacy/export").expect(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const reqs = await prisma.privacyRequest.findMany({
      where: { userId: user.id, kind: "export" },
    });
    expect(reqs).toHaveLength(1);
    expect(reqs[0].status).toBe("completed");
    // 30 days from the policy, not an arbitrary number.
    const window = reqs[0].dueBy.getTime() - reqs[0].createdAt.getTime();
    expect(Math.abs(window - PRIVACY_REQUEST_SLA.exportMs)).toBeLessThan(5000);
  });

  it("is refused when signed out", async () => {
    await request(app).get("/api/privacy/export").expect(401);
  });
});

describe("erasure", () => {
  it("will not schedule on a session alone, without the password", async () => {
    const { agent } = await authedAgent();
    // A borrowed, unlocked phone should not be enough to destroy an account.
    await agent.post("/api/privacy/deletion").send({}).expect(403);
    await agent
      .post("/api/privacy/deletion")
      .send({ password: "not-the-password" })
      .expect(403);
  });

  it("schedules, and can be cancelled while it is still scheduled", async () => {
    const { agent, email } = await authedAgent();
    const res = await agent
      .post("/api/privacy/deletion")
      .send({ password: "password123" })
      .expect(202);
    expect(res.body.scheduledFor).toBeTruthy();

    let user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.deletionScheduledFor).toBeInstanceOf(Date);
    // Inside the 45 days the policy allows for processing, not on the boundary.
    const grace = user.deletionScheduledFor!.getTime() - Date.now();
    expect(grace).toBeLessThan(PRIVACY_REQUEST_SLA.deletionMs);
    expect(Math.abs(grace - DELETION_GRACE_MS)).toBeLessThan(60_000);

    // The account still works during the wait: that is what makes cancelling
    // possible at all.
    await agent.get("/api/auth/me").expect(200);

    await agent.delete("/api/privacy/deletion").expect(200);
    user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.deletionScheduledFor).toBeNull();
  });

  it("refuses a second request while one is pending", async () => {
    const { agent } = await authedAgent();
    await agent.post("/api/privacy/deletion").send({ password: "password123" }).expect(202);
    await agent.post("/api/privacy/deletion").send({ password: "password123" }).expect(409);
  });

  it("leaves nothing that identifies the person, and no way to sign in", async () => {
    const { email } = await authedAgent();
    const before = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.address.create({
      data: {
        userId: before.id,
        label: "Home",
        line1: "A",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500001",
      },
    });

    await eraseAccount(before.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: before.id } });
    // Overwritten, not blanked. A null says the value is gone; an overwritten
    // value is what makes the original unrecoverable from this row.
    expect(after.email).not.toBe(email);
    expect(after.email).toMatch(/^erased-[0-9a-f]+@deleted\.invalid$/);
    expect(after.name).toBe("Deleted account");
    expect(after.passwordHash).toBeNull();
    expect(after.phone).toBeNull();
    expect(after.dateOfBirth).toBeNull();
    expect(after.deletedAt).toBeInstanceOf(Date);
    // Erasure that leaves the data feeding a model is not erasure.
    expect(after.aiTrainingOptOut).toBe(true);

    expect(await prisma.address.count({ where: { userId: before.id } })).toBe(0);
    expect(await prisma.refreshToken.count({ where: { userId: before.id } })).toBe(0);

    // The old address is now free, and signing in with it finds nothing.
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect((r) => expect([400, 401, 403]).toContain(r.status));
  });

  it("erases two accounts without the second colliding with the first", async () => {
    // Both erased rows would hold the same value if the email were nulled,
    // and the unique constraint would fail the second erasure at exactly the
    // moment it must not.
    const a = await authedAgent();
    const b = await authedAgent();
    const ua = await prisma.user.findUniqueOrThrow({ where: { email: a.email } });
    const ub = await prisma.user.findUniqueOrThrow({ where: { email: b.email } });
    await eraseAccount(ua.id);
    await eraseAccount(ub.id);
    const [ea, eb] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: ua.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: ub.id } }),
    ]);
    expect(ea.email).not.toBe(eb.email);
  });

  it("carries out an erasure once its grace period has passed", async () => {
    const { agent, email } = await authedAgent();
    await agent.post("/api/privacy/deletion").send({ password: "password123" }).expect(202);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Nothing is due yet.
    expect(await processDueDeletions(new Date())).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
    ).toBeNull();

    const afterGrace = new Date(Date.now() + DELETION_GRACE_MS + 60_000);
    const count = await processDueDeletions(afterGrace);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).deletedAt,
    ).toBeInstanceOf(Date);
  });
});

describe("cookie choice", () => {
  it("saves each category and reads it back", async () => {
    const { agent } = await authedAgent();
    const first = await agent.get("/api/privacy/cookies").expect(200);
    // Nothing is assumed before a choice is made.
    expect(first.body.choice).toEqual({
      analytics: false,
      advertising: false,
      social: false,
      performance: false,
    });
    // The inventory says what is actually set, which today is auth only.
    expect(first.body.inUse.every((c: { category: string }) => c.category === "essential")).toBe(true);

    await agent
      .put("/api/privacy/cookies")
      .send({ analytics: true, advertising: false, social: false, performance: true })
      .expect(200);

    const after = await agent.get("/api/privacy/cookies").expect(200);
    expect(after.body.choice).toEqual({
      analytics: true,
      advertising: false,
      social: false,
      performance: true,
    });
    expect(after.body.chosenAt).toBeTruthy();
  });

  it("refuses a partial or unknown category rather than guessing", async () => {
    const { agent } = await authedAgent();
    await agent.put("/api/privacy/cookies").send({ analytics: true }).expect(400);
    await agent
      .put("/api/privacy/cookies")
      .send({
        analytics: true,
        advertising: false,
        social: false,
        performance: false,
        essential: false, // not a thing anyone may switch off
      })
      .expect(400);
  });

  it("logs every choice, so a withdrawal does not erase the grant", async () => {
    const { agent, email } = await authedAgent();
    const on = { analytics: true, advertising: true, social: true, performance: true };
    await agent.put("/api/privacy/cookies").send(on).expect(200);
    await agent
      .put("/api/privacy/cookies")
      .send({ analytics: false, advertising: false, social: false, performance: false })
      .expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const log = await prisma.consentRecord.findMany({
      where: { userId: user.id, kind: "cookies" },
      orderBy: { createdAt: "asc" },
    });
    expect(log).toHaveLength(2);
    expect(log[0].granted).toBe(true);
    expect(log[1].granted).toBe(false);
  });
});

describe("model training opt-out", () => {
  it("sets the flag and records it as a withdrawn consent", async () => {
    const { agent, email } = await authedAgent();
    await agent.put("/api/privacy/ai-training").send({ optOut: true }).expect(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.aiTrainingOptOut).toBe(true);

    const log = await prisma.consentRecord.findFirst({
      where: { userId: user.id, kind: "ai_training" },
      orderBy: { createdAt: "desc" },
    });
    expect(log?.granted).toBe(false);

    // And opens a request, because the policy gives it a 30 day deadline.
    const req = await prisma.privacyRequest.findFirst({
      where: { userId: user.id, kind: "training_opt_out" },
    });
    expect(req).not.toBeNull();
  });

  it("can be turned back on", async () => {
    const { agent, email } = await authedAgent();
    await agent.put("/api/privacy/ai-training").send({ optOut: true }).expect(200);
    await agent.put("/api/privacy/ai-training").send({ optOut: false }).expect(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.aiTrainingOptOut).toBe(false);
  });
});

describe("the consent log is visible to the person it is about", () => {
  it("lists their own records and nobody else's", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    await b.agent.put("/api/privacy/ai-training").send({ optOut: true }).expect(200);

    const res = await a.agent.get("/api/privacy/consents").expect(200);
    const kinds = res.body.consents.map((c: { kind: string }) => c.kind);
    expect(kinds).toContain("terms");
    // B's opt-out must not appear in A's log.
    expect(kinds).not.toContain("ai_training");
  });
});
