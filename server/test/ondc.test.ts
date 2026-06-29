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

// The ONDC emissions are fire-and-forget; give the async writes a moment to land.
async function settle(ms = 250) {
  await new Promise((r) => setTimeout(r, ms));
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

describe("ONDC transaction viewer", () => {
  it("records Beckn-shaped discovery + confirmation flows on an order", async () => {
    const { agent: u } = await authedAgent();
    const orderId = await payFood(u);
    await settle();

    const rows = await prisma.ondcTransaction.findMany({ where: { orderId } });
    const actions = rows.map((r) => r.action).sort();
    // search/on_search + select/on_select (discovery) and confirm/on_confirm +
    // status/on_status (confirmation) — eight envelopes for the journey.
    expect(actions).toContain("search");
    expect(actions).toContain("on_search");
    expect(actions).toContain("confirm");
    expect(actions).toContain("on_confirm");
    expect(actions).toContain("status");

    // Every row shares the order's transaction_id and is marked simulated
    // (pre-registration), signed, and carries a valid Beckn envelope.
    const txnIds = new Set(rows.map((r) => r.txnId));
    expect(txnIds.size).toBe(1);
    for (const r of rows) {
      expect(r.simulated).toBe(true);
      expect(r.signed).toBe(true);
      const env = JSON.parse((r.request ?? r.response)!);
      expect(env.context.transaction_id).toBe([...txnIds][0]);
      expect(env.context.core_version).toBe("1.2.0");
      expect(env.context.action).toBe(r.action);
    }
  });

  it("a developer can list and open a transaction; an admin cannot", async () => {
    const { agent: u } = await authedAgent();
    await payFood(u);
    await settle();

    const dev = await authedAgent();
    await promote(dev.agent, dev.email, "developer");

    const list = await dev.agent.get("/api/console/dev/transactions").expect(200);
    expect(list.body.total).toBeGreaterThan(0);
    expect(list.body.mode).toBeDefined();
    expect(list.body.byAction.search).toBeGreaterThanOrEqual(1);

    const first = list.body.transactions[0];
    const detail = await dev.agent
      .get(`/api/console/dev/transactions/${first.id}`)
      .expect(200);
    expect(detail.body.transaction.id).toBe(first.id);

    // An admin (different tier) can't reach the developer viewer.
    const adm = await authedAgent();
    await promote(adm.agent, adm.email, "admin");
    await adm.agent.get("/api/console/dev/transactions").expect(404);
  });

  it("filters by action", async () => {
    const { agent: u } = await authedAgent();
    await payFood(u);
    await settle();

    const dev = await authedAgent();
    await promote(dev.agent, dev.email, "developer");

    const res = await dev.agent
      .get("/api/console/dev/transactions?action=confirm")
      .expect(200);
    expect(res.body.transactions.every((t: { action: string }) => t.action === "confirm")).toBe(true);
  });
});
