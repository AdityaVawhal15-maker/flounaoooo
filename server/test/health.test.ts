import { describe, expect, it, vi, afterEach } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// The health endpoint, and the difference between "the database answered" and
// "the database is usable".
//
// This was found on the live site. Health reported db: "ok" while signup and
// login both returned 500, because the check was a bare SELECT 1 — which proves
// a connection exists and nothing whatever about the schema on the other end.
// A deployment pointed at an empty database therefore looked healthy to every
// uptime monitor while no one could create an account.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("health check", () => {
  it("reports ok when the database is reachable AND has a schema", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.db).toBe("ok");
    expect(typeof res.body.latencyMs).toBe("number");
  });

  it("fails when the connection works but the schema is missing", async () => {
    // Exactly the shape of the production fault: the raw query succeeds, the
    // first real table query does not.
    vi.spyOn(prisma.user, "count").mockRejectedValueOnce(
      new Error('relation "User" does not exist'),
    );

    const res = await request(app).get("/api/health").expect(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.db).toBe("schema-missing");
    // The hint has to point at the right action, since "unreachable" and
    // "no schema" send whoever is on call to check entirely different things.
    expect(res.body.hint).toMatch(/schema/i);
  });

  it("says unreachable when the database is genuinely down", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await request(app).get("/api/health").expect(503);
    expect(res.body.db).toBe("unreachable");
    expect(res.body.hint).toMatch(/DATABASE_URL|reached/i);
  });

  it("never returns 200 with a broken database", async () => {
    // The whole point: a monitor polling this must not see green while the
    // application is unusable.
    vi.spyOn(prisma.user, "count").mockRejectedValueOnce(new Error("P2021"));
    const res = await request(app).get("/api/health");
    expect(res.status).not.toBe(200);
    expect(res.body.ok).not.toBe(true);
  });
});
