import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import {
  setOperatorRole,
  setOperatorSuspended,
} from "../src/modules/backoffice/super.service.js";

async function promote(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  email: string,
  role: string,
) {
  await prisma.user.update({ where: { email }, data: { role } });
  await agent.post("/api/auth/refresh").expect(200);
}

// Ensure at least one OTHER active super-admin exists so last-super-admin guards
// don't fire on unrelated tests (each test that needs isolation makes its own).
async function seedSpareSuperAdmin() {
  const { email } = await authedAgent();
  await prisma.user.update({ where: { email }, data: { role: "super_admin" } });
}

describe("super-admin access control", () => {
  it("admin and developer cannot reach super routes (404)", async () => {
    const dev = await authedAgent();
    await promote(dev.agent, dev.email, "developer");
    await dev.agent.get("/api/console/super/operators").expect(404);

    const adm = await authedAgent();
    await promote(adm.agent, adm.email, "admin");
    await adm.agent.get("/api/console/super/operators").expect(404);
  });

  it("a super_admin can list operators, revenue and config", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");

    const ops = await agent.get("/api/console/super/operators").expect(200);
    expect(Array.isArray(ops.body.operators)).toBe(true);

    const rev = await agent.get("/api/console/super/revenue").expect(200);
    expect(typeof rev.body.grossPaise).toBe("number");
    expect(rev.body.subscriptions.planPaise).toBeGreaterThan(0);

    const cfg = await agent.get("/api/console/super/config").expect(200);
    expect(cfg.body.secrets.database).toBe(true); // DATABASE_URL is always set
  });
});

describe("role management guards", () => {
  it("a super_admin can promote a user to admin, and it is audited", async () => {
    const { email: targetEmail } = await authedAgent();
    const target = await prisma.user.findUniqueOrThrow({ where: { email: targetEmail } });

    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");

    await agent
      .patch(`/api/console/super/operators/${target.id}/role`)
      .send({ role: "admin" })
      .expect(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.role).toBe("admin");

    const audited = await prisma.auditLog.findFirst({
      where: { action: "role.set", targetId: target.id },
    });
    expect(audited).toBeTruthy();
  });

  it("a super_admin cannot demote themselves (self guard)", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");
    const me = await prisma.user.findUniqueOrThrow({ where: { email } });

    await agent
      .patch(`/api/console/super/operators/${me.id}/role`)
      .send({ role: "admin" })
      .expect(409);

    // Still a super_admin.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    expect(after.role).toBe("super_admin");
  });

  it("cannot demote the last active super-admin", async () => {
    // Make this the ONLY super-admin by ensuring no others are active: we can't
    // touch other tests' users, so instead create a second super and have THEM
    // try to demote the first while we suspend the rest is overkill — simplest:
    // a super demotes another super, leaving themselves as the last one.
    const first = await authedAgent();
    await promote(first.agent, first.email, "super_admin");
    const firstUser = await prisma.user.findUniqueOrThrow({ where: { email: first.email } });

    const second = await authedAgent();
    await promote(second.agent, second.email, "super_admin");

    // `second` demotes `first` — allowed (others remain). Then `first` is gone as
    // a super; if `second` now tries to demote themselves via the self guard it's
    // blocked, but to specifically hit last_super_admin we suspend everyone else.
    await second.agent
      .patch(`/api/console/super/operators/${firstUser.id}/role`)
      .send({ role: "admin" })
      .expect(200);

    // Suspend all OTHER active supers so `second` is provably the last one.
    const secondUser = await prisma.user.findUniqueOrThrow({ where: { email: second.email } });
    await prisma.user.updateMany({
      where: { role: "super_admin", id: { not: secondUser.id } },
      data: { suspendedAt: new Date() },
    });

    // Now a DIFFERENT super can't exist to demote `second`; `second` demoting
    // themselves hits the self guard (409) — both protect the seat. Assert self.
    await second.agent
      .patch(`/api/console/super/operators/${secondUser.id}/role`)
      .send({ role: "admin" })
      .expect(409);
  });

  it("cannot suspend the last active super-admin", async () => {
    const lone = await authedAgent();
    await promote(lone.agent, lone.email, "super_admin");
    const loneUser = await prisma.user.findUniqueOrThrow({ where: { email: lone.email } });

    // Make this the only active super-admin.
    await prisma.user.updateMany({
      where: { role: "super_admin", id: { not: loneUser.id } },
      data: { suspendedAt: new Date() },
    });

    // Self-suspend is blocked by the self guard (409).
    await lone.agent
      .patch(`/api/console/super/operators/${loneUser.id}/suspend`)
      .send({ suspended: true })
      .expect(409);
  });

  it("service blocks demoting the last super-admin (actor != target)", async () => {
    // Two distinct supers: actorA demotes lastB. Suspend every other super so B
    // is provably the last ACTIVE one — this hits last_super_admin, not self.
    const a = await authedAgent();
    await prisma.user.update({ where: { email: a.email }, data: { role: "super_admin" } });
    const actorA = await prisma.user.findUniqueOrThrow({ where: { email: a.email } });

    const b = await authedAgent();
    await prisma.user.update({ where: { email: b.email }, data: { role: "super_admin" } });
    const lastB = await prisma.user.findUniqueOrThrow({ where: { email: b.email } });

    // Suspend all supers except B (including A) so B is the lone active super.
    await prisma.user.updateMany({
      where: { role: "super_admin", id: { not: lastB.id } },
      data: { suspendedAt: new Date() },
    });

    // A (suspended, but we call the service directly) tries to demote B → blocked.
    const result = await setOperatorRole(actorA.id, lastB.id, "admin");
    expect(result).toEqual({ ok: false, reason: "last_super_admin" });

    // And suspending the lone active super is likewise refused.
    const susp = await setOperatorSuspended(actorA.id, lastB.id, true);
    expect(susp).toEqual({ ok: false, reason: "last_super_admin" });
  });

  it("refuses to suspend an ordinary (non-operator) user from the super module", async () => {
    const { email: userEmail } = await authedAgent();
    const plain = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });

    await seedSpareSuperAdmin();
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");

    await agent
      .patch(`/api/console/super/operators/${plain.id}/suspend`)
      .send({ suspended: true })
      .expect(400);
  });
});
