import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent, stepUp } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import {
  roleSatisfies,
  roleSatisfiesAny,
  isOperator,
  normalizeRole,
} from "../src/lib/rbac.js";

// Promote the agent's user to a role, then complete the console step-up (2FA)
// flow so the session is verified for the back-office.
async function promote(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  email: string,
  role: string,
) {
  await prisma.user.update({ where: { email }, data: { role } });
  await stepUp(agent, email);
}

describe("rbac core", () => {
  it("hierarchy: super_admin satisfies admin, admin does not satisfy super", () => {
    expect(roleSatisfies("super_admin", "admin")).toBe(true);
    expect(roleSatisfies("super_admin", "super_admin")).toBe(true);
    expect(roleSatisfies("admin", "admin")).toBe(true);
    expect(roleSatisfies("admin", "super_admin")).toBe(false);
  });

  it("developer is a sibling, not above admin", () => {
    expect(roleSatisfies("developer", "admin")).toBe(false);
    expect(roleSatisfies("admin", "developer")).toBe(false);
    expect(roleSatisfies("developer", "developer")).toBe(true);
  });

  it("roleSatisfiesAny accepts a matching role from a set, denies otherwise", () => {
    expect(roleSatisfiesAny("developer", ["developer", "super_admin"])).toBe(true);
    expect(roleSatisfiesAny("super_admin", ["developer", "super_admin"])).toBe(true);
    // An admin is NOT in {developer, super_admin}, and admin doesn't satisfy
    // either by hierarchy → denied.
    expect(roleSatisfiesAny("admin", ["developer", "super_admin"])).toBe(false);
    expect(roleSatisfiesAny("user", ["developer"])).toBe(false);
  });

  it("isOperator / normalizeRole", () => {
    expect(isOperator("user")).toBe(false);
    expect(isOperator("developer")).toBe(true);
    expect(normalizeRole("garbage")).toBe("user");
    expect(normalizeRole("admin")).toBe("admin");
  });
});

describe("developer console access control", () => {
  it("an ordinary user gets 404 (surface hidden), not 403", async () => {
    const { agent } = await authedAgent();
    await agent.get("/api/console/dev/health").expect(404);
    await agent.get("/api/console/dev/errors").expect(404);
  });

  it("an unauthenticated request gets 401", async () => {
    await request(app).get("/api/console/dev/health").expect(401);
  });

  it("a developer can read health, providers, errors and flags", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");

    const health = await agent.get("/api/console/dev/health").expect(200);
    expect(health.body.ok).toBe(true);
    expect(health.body.db).toBe("ok");

    const providers = await agent.get("/api/console/dev/providers").expect(200);
    expect(providers.body.llm).toBeTruthy();
    expect(providers.body.fulfilment.mode).toBeDefined();

    const errors = await agent.get("/api/console/dev/errors").expect(200);
    expect(Array.isArray(errors.body.errors)).toBe(true);

    const flags = await agent.get("/api/console/dev/flags").expect(200);
    expect(flags.body.flags.length).toBeGreaterThan(0);
  });

  it("a super_admin can also reach the developer console", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");
    await agent.get("/api/console/dev/health").expect(200);
  });

  it("revoking a role takes effect immediately (next request blocked)", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");
    await agent.get("/api/console/dev/health").expect(200);

    // Demote in the DB WITHOUT refreshing the token — requireRole re-checks the
    // DB, so the still-valid "developer" JWT must no longer grant access.
    await prisma.user.update({ where: { email }, data: { role: "user" } });
    await agent.get("/api/console/dev/health").expect(404);
  });

  it("a suspended operator is locked out", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");
    await agent.get("/api/console/dev/health").expect(200);

    await prisma.user.update({
      where: { email },
      data: { suspendedAt: new Date() },
    });
    await agent.get("/api/console/dev/health").expect(403);
  });

  it("a developer can toggle a feature flag and it is audited", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");

    await agent
      .patch("/api/console/dev/flags/hybrid_ai_rerank")
      .send({ enabled: true })
      .expect(200);

    const flags = await agent.get("/api/console/dev/flags").expect(200);
    const flag = flags.body.flags.find(
      (f: { key: string }) => f.key === "hybrid_ai_rerank",
    );
    expect(flag.enabled).toBe(true);

    const audit = await agent.get("/api/console/dev/audit").expect(200);
    expect(
      audit.body.logs.some((l: { action: string }) => l.action === "flag.set"),
    ).toBe(true);
  });
});
