import { describe, expect, it } from "vitest";
import { authedAgent, stepUp } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

async function promote(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  email: string,
  role: string,
) {
  await prisma.user.update({ where: { email }, data: { role } });
  await stepUp(agent, email);
}

async function payFood(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  dishId = "dum-biryani",
) {
  const o = await agent
    .post("/api/orders")
    .send({ domain: "food", dishId, platform: "ondc" })
    .expect(201);
  const orderId = o.body.order.id as string;
  await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
  await agent.post("/api/payments/simulate").send({ orderId, method: "upi" }).expect(200);
  return orderId;
}

describe("admin reporting dashboards", () => {
  it("dashboard summary aggregates real orders + revenue model", async () => {
    const { agent: u } = await authedAgent();
    await payFood(u);

    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    const res = await agent.get("/api/console/admin/dashboard").expect(200);
    expect(res.body.totalOrders).toBeGreaterThanOrEqual(1);
    expect(res.body.gmvPaise).toBeGreaterThan(0);
    // Revenue is computed server-side and is internally consistent.
    const r = res.body.revenue;
    expect(r.totalPaise).toBe(r.ondcPaise + r.partnerPaise + r.conveniencePaise);
    // An in-app (ONDC) food order contributes to the ONDC share.
    expect(res.body.ondcOrders).toBeGreaterThanOrEqual(1);
  });

  it("city report marks demo rows honestly and carries real volume on the primary city", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");
    const res = await agent.get("/api/console/admin/cities").expect(200);
    expect(res.body.citiesActive).toBeGreaterThan(0);
    const hyd = res.body.rows.find((r: { city: string }) => r.city === "Hyderabad");
    expect(hyd.demo).toBe(false); // primary city = real numbers
    const other = res.body.rows.find((r: { city: string }) => r.city === "Mumbai");
    expect(other.demo).toBe(true); // coverage row, clearly flagged
  });

  it("vendors, coupons and decisions derive from real order/chat data", async () => {
    const { agent: u } = await authedAgent();
    await payFood(u);

    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    const vendors = await agent.get("/api/console/admin/vendors").expect(200);
    expect(vendors.body.totalVendors).toBeGreaterThanOrEqual(1);

    const coupons = await agent.get("/api/console/admin/coupons").expect(200);
    expect(Array.isArray(coupons.body.coupons)).toBe(true);

    const decisions = await agent.get("/api/console/admin/decisions").expect(200);
    expect(Array.isArray(decisions.body.logs)).toBe(true);
  });

  it("a developer cannot read admin reports (404)", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");
    await agent.get("/api/console/admin/dashboard").expect(404);
  });
});

describe("super-admin API keys", () => {
  it("creates a key returning the raw secret ONCE, then revokes it", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");

    const created = await agent
      .post("/api/console/super/api-keys")
      .send({ name: "Test Key", client: "MK Electronics", scope: "read" })
      .expect(201);
    expect(created.body.key).toMatch(/^alg_(test|live)_/);
    const id = created.body.id as string;

    // Listing never returns the secret — only the prefix.
    const list = await agent.get("/api/console/super/api-keys").expect(200);
    const row = list.body.keys.find((k: { id: string }) => k.id === id);
    expect(row).toBeTruthy();
    expect(row.key).toBeUndefined();
    expect(row.prefix).toBe(created.body.prefix);

    await agent.delete(`/api/console/super/api-keys/${id}`).expect(200);
    const after = await prisma.apiKey.findUniqueOrThrow({ where: { id } });
    expect(after.revokedAt).not.toBeNull();
  });

  it("an admin cannot manage API keys (404)", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");
    await agent.get("/api/console/super/api-keys").expect(404);
  });
});

describe("super-admin settings clamp to ONDC norms", () => {
  it("clamps ONDC margin into the 3-6% (300-600 bps) band", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");

    // Try to set an illegal 9% margin → clamped to 600 bps (6%).
    const res = await agent
      .patch("/api/console/super/settings")
      .send({ ondcMaxMarginBps: 900 })
      .expect(200);
    expect(res.body.ondcMaxMarginBps).toBe(600);

    // And a 1% floor (below 3%) → clamped up to 300 bps.
    const res2 = await agent
      .patch("/api/console/super/settings")
      .send({ ondcMinMarginBps: 100 })
      .expect(200);
    expect(res2.body.ondcMinMarginBps).toBe(300);
  });
});

describe("developer network + alerts", () => {
  it("reports ONDC network mode and a derived alerts feed", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");

    const net = await agent.get("/api/console/dev/network").expect(200);
    expect(net.body.mode).toBeDefined();
    expect(net.body.domains.length).toBeGreaterThanOrEqual(2);

    const alerts = await agent.get("/api/console/dev/alerts").expect(200);
    expect(Array.isArray(alerts.body.alerts)).toBe(true);
    // Simulation mode always surfaces the informational ONDC notice.
    expect(alerts.body.alerts.some((a: { source: string }) => a.source === "ondc")).toBe(true);
  });
});
