import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

async function promote(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  email: string,
  role: string,
) {
  await prisma.user.update({ where: { email }, data: { role } });
  await agent.post("/api/auth/refresh").expect(200);
}

// Place + pay a food order; returns the order id.
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

describe("admin console access control", () => {
  it("an ordinary user gets 404 on admin routes", async () => {
    const { agent } = await authedAgent();
    await agent.get("/api/console/admin/analytics").expect(404);
    await agent.get("/api/console/admin/users").expect(404);
  });

  it("a developer (sibling role) cannot reach admin routes", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "developer");
    await agent.get("/api/console/admin/analytics").expect(404);
  });

  it("an admin can read analytics, users and orders", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    const analytics = await agent.get("/api/console/admin/analytics").expect(200);
    expect(typeof analytics.body.users.total).toBe("number");
    expect(analytics.body.orders).toBeTruthy();

    const users = await agent.get("/api/console/admin/users").expect(200);
    expect(Array.isArray(users.body.users)).toBe(true);

    const orders = await agent.get("/api/console/admin/orders").expect(200);
    expect(Array.isArray(orders.body.orders)).toBe(true);
  });

  it("a super_admin satisfies admin via hierarchy", async () => {
    const { agent, email } = await authedAgent();
    await promote(agent, email, "super_admin");
    await agent.get("/api/console/admin/analytics").expect(200);
  });
});

describe("admin user management", () => {
  it("suspends and reinstates an ordinary user, and audits it", async () => {
    // Target user.
    const { email: targetEmail } = await authedAgent();
    const target = await prisma.user.findUniqueOrThrow({ where: { email: targetEmail } });

    // Admin actor.
    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    await agent
      .patch(`/api/console/admin/users/${target.id}/suspend`)
      .send({ suspended: true })
      .expect(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.suspendedAt).not.toBeNull();

    const audited = await prisma.auditLog.findFirst({
      where: { action: "user.suspend", targetId: target.id },
    });
    expect(audited).toBeTruthy();

    await agent
      .patch(`/api/console/admin/users/${target.id}/suspend`)
      .send({ suspended: false })
      .expect(200);
  });

  it("refuses to suspend a fellow operator (403)", async () => {
    const { email: opEmail } = await authedAgent();
    const op = await prisma.user.findUniqueOrThrow({ where: { email: opEmail } });
    await prisma.user.update({ where: { id: op.id }, data: { role: "developer" } });

    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    await agent
      .patch(`/api/console/admin/users/${op.id}/suspend`)
      .send({ suspended: true })
      .expect(403);
  });
});

describe("admin refunds and tickets", () => {
  it("flags a refund on a paid order and audits it", async () => {
    const { agent: userAgent } = await authedAgent();
    const orderId = await payFood(userAgent);

    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    await agent.post(`/api/console/admin/orders/${orderId}/flag-refund`).expect(200);

    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId } });
    expect(payment.status).toBe("refund_pending");

    const audited = await prisma.auditLog.findFirst({
      where: { action: "order.flag_refund", targetId: orderId },
    });
    expect(audited).toBeTruthy();
  });

  it("a user raises a ticket; the admin sees it in the queue and resolves it", async () => {
    const { agent: userAgent } = await authedAgent();
    const created = await userAgent
      .post("/api/users/tickets")
      .send({ category: "refund", subject: "Wrong item", body: "I got the wrong dish entirely." })
      .expect(201);
    const ticketId = created.body.ticket.id as string;
    // Refund category should be auto-prioritised high.
    expect(created.body.ticket.priority).toBe("high");

    const { agent, email } = await authedAgent();
    await promote(agent, email, "admin");

    const queue = await agent.get("/api/console/admin/tickets?status=open").expect(200);
    expect(queue.body.tickets.some((t: { id: string }) => t.id === ticketId)).toBe(true);

    await agent
      .patch(`/api/console/admin/tickets/${ticketId}`)
      .send({ status: "resolved", resolution: "Refund issued", assignToMe: true })
      .expect(200);

    const resolved = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(resolved.status).toBe("resolved");
    expect(resolved.assigneeId).toBeTruthy();
  });
});
