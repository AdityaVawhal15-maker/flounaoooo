import { describe, expect, it } from "vitest";
import { authedAgent, consoleAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Place + pay a food order for a fresh user; returns ids for assertions.
async function paidOrder(agent: Awaited<ReturnType<typeof authedAgent>>["agent"]) {
  const o = await agent
    .post("/api/orders")
    .send({ domain: "food", dishId: "dum-biryani", platform: "ondc" })
    .expect(201);
  const orderId = o.body.order.id as string;
  await agent.post("/api/payments/checkout").send({ orderId }).expect(200);
  await agent.post("/api/payments/simulate").send({ orderId, method: "upi" }).expect(200);
  return orderId;
}

describe("super-admin growth analytics", () => {
  it("returns a continuous daily series derived from real orders + signups", async () => {
    const { agent: buyer } = await authedAgent();
    await paidOrder(buyer);

    const { agent } = await consoleAgent("super_admin");
    const res = await agent.get("/api/console/super/growth").expect(200);

    expect(res.body.series).toHaveLength(30); // continuous axis, one row per day
    expect(res.body.totals.orders).toBeGreaterThanOrEqual(1);
    expect(res.body.totals.gmvPaise).toBeGreaterThan(0);
    expect(res.body.totals.signups).toBeGreaterThanOrEqual(2); // buyer + operator
    expect(res.body.totals.activeBuyers7d).toBeGreaterThanOrEqual(1);
    // Today's bucket carries the order we just paid.
    const today = res.body.series[res.body.series.length - 1];
    expect(today.orders).toBeGreaterThanOrEqual(1);
    expect(today.gmvPaise).toBeGreaterThan(0);
  });

  it("clamps the days window and stays admin-inaccessible", async () => {
    const sup = await consoleAgent("super_admin");
    const res = await sup.agent.get("/api/console/super/growth?days=500").expect(200);
    expect(res.body.days).toBe(90); // clamped

    const adm = await consoleAgent("admin");
    await adm.agent.get("/api/console/super/growth").expect(404);
  });
});

describe("super-admin refund queue", () => {
  it("flag (admin) → approve (super) marks the payment refunded, exactly once", async () => {
    const { agent: buyer } = await authedAgent();
    const orderId = await paidOrder(buyer);

    const adm = await consoleAgent("admin");
    await adm.agent.post(`/api/console/admin/orders/${orderId}/flag-refund`).expect(200);

    const sup = await consoleAgent("super_admin");
    const queue = await sup.agent.get("/api/console/super/refunds").expect(200);
    const item = queue.body.refunds.find((r: { orderId: string }) => r.orderId === orderId);
    expect(item).toBeTruthy();
    expect(item.amountPaise).toBeGreaterThan(0);
    expect(item.user.email).toContain("@");

    await sup.agent.post(`/api/console/super/refunds/${item.paymentId}/approve`).expect(200);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: item.paymentId } });
    expect(payment.status).toBe("refunded");

    // Settling twice is refused — the claim is status-scoped.
    await sup.agent.post(`/api/console/super/refunds/${item.paymentId}/approve`).expect(409);

    // Audited.
    const audited = await prisma.auditLog.findFirst({
      where: { action: "refund.approve", targetId: item.paymentId },
    });
    expect(audited).toBeTruthy();
  });

  it("reject restores the payment to success (with a required reason)", async () => {
    const { agent: buyer } = await authedAgent();
    const orderId = await paidOrder(buyer);
    const adm = await consoleAgent("admin");
    await adm.agent.post(`/api/console/admin/orders/${orderId}/flag-refund`).expect(200);

    const sup = await consoleAgent("super_admin");
    const queue = await sup.agent.get("/api/console/super/refunds").expect(200);
    const item = queue.body.refunds.find((r: { orderId: string }) => r.orderId === orderId);

    // Reason is mandatory.
    await sup.agent.post(`/api/console/super/refunds/${item.paymentId}/reject`).send({}).expect(400);
    await sup.agent
      .post(`/api/console/super/refunds/${item.paymentId}/reject`)
      .send({ reason: "Customer withdrew the request" })
      .expect(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: item.paymentId } });
    expect(payment.status).toBe("success");
  });

  it("admins cannot settle refunds (404)", async () => {
    const adm = await consoleAgent("admin");
    await adm.agent.get("/api/console/super/refunds").expect(404);
    await adm.agent.post("/api/console/super/refunds/whatever/approve").expect(404);
  });
});

describe("super-admin broadcast", () => {
  it("is honest when push is not configured (no VAPID in tests)", async () => {
    const sup = await consoleAgent("super_admin");
    const res = await sup.agent
      .post("/api/console/super/broadcast")
      .send({ title: "Radiues update", body: "New features are live — take a look!" })
      .expect(200);
    expect(res.body.configured).toBe(false);
    expect(res.body.sent).toBe(0);

    // Still audited, with the honest outcome recorded.
    const audited = await prisma.auditLog.findFirst({
      where: { action: "broadcast.send" },
      orderBy: { createdAt: "desc" },
    });
    expect(audited?.summary).toContain("push not configured");
  });

  it("validates the message", async () => {
    const sup = await consoleAgent("super_admin");
    await sup.agent.post("/api/console/super/broadcast").send({ title: "x", body: "y" }).expect(400);
  });
});

describe("super-admin CSV exports", () => {
  it("exports orders + users as CSV, audited, super-only", async () => {
    const { agent: buyer } = await authedAgent();
    await paidOrder(buyer);

    const sup = await consoleAgent("super_admin");
    const orders = await sup.agent.get("/api/console/super/export/orders.csv").expect(200);
    expect(orders.headers["content-type"]).toContain("text/csv");
    const lines = orders.text.trim().split("\n");
    expect(lines[0]).toContain("order_id");
    expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least one row

    const users = await sup.agent.get("/api/console/super/export/users.csv").expect(200);
    expect(users.text.split("\n")[0]).toContain("user_id");

    const adm = await consoleAgent("admin");
    await adm.agent.get("/api/console/super/export/orders.csv").expect(404);
  });
});
