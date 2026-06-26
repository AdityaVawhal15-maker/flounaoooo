import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

describe("health endpoint", () => {
  it("reports ok with a reachable database", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe("radiues-api");
    expect(res.body.db).toBe("ok");
    expect(typeof res.body.uptimeSeconds).toBe("number");
    expect(typeof res.body.latencyMs).toBe("number");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("needs no authentication (monitors poll it freely)", async () => {
    // No cookies / token attached — still 200.
    await request(app).get("/api/health").expect(200);
  });
});
