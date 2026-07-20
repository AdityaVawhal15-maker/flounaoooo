import { beforeEach, describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import {
  drainOutbox,
  enqueueNotification,
  outboxDelivered,
} from "../src/modules/notifications/outbox.service.js";

async function userIdFor(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return u.id;
}

describe("notification outbox", () => {
  beforeEach(() => {
    outboxDelivered.length = 0;
  });

  it("enqueues and delivers a security email regardless of preferences", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);
    // All email preferences off — security must still send.
    await agent
      .put("/api/users/preferences")
      .send({ emailUpdates: false, emailMoneyUpdates: false, emailTips: false })
      .expect(200);

    await enqueueNotification(userId, "security.password_changed");
    await drainOutbox();

    const sent = outboxDelivered.filter((d) => d.to === email);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe("security.password_changed");

    const row = await prisma.notification.findFirst({ where: { userId } });
    expect(row?.status).toBe("sent");
    expect(row?.sentAt).toBeTruthy();
  });

  it("skips money email when the category toggle is off", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);
    await agent
      .put("/api/users/preferences")
      .send({ emailMoneyUpdates: false })
      .expect(200);

    await enqueueNotification(userId, "money.savings_milestone", {
      amount: "₹500",
    });
    await drainOutbox();

    expect(outboxDelivered.filter((d) => d.to === email)).toHaveLength(0);
    const row = await prisma.notification.findFirst({ where: { userId } });
    expect(row?.status).toBe("skipped");
    expect(row?.error).toBe("preference off");
  });

  it("dedupes on dedupeKey — second enqueue is a no-op", async () => {
    const { email } = await authedAgent();
    const userId = await userIdFor(email);

    const first = await enqueueNotification(
      userId,
      "security.address_added",
      { label: "home" },
      { dedupeKey: `t:${userId}` },
    );
    const second = await enqueueNotification(
      userId,
      "security.address_added",
      { label: "home" },
      { dedupeKey: `t:${userId}` },
    );
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(
      await prisma.notification.count({ where: { userId } }),
    ).toBe(1);
  });

  it("rejects unknown types loudly outside production", async () => {
    const { email } = await authedAgent();
    const userId = await userIdFor(email);
    await expect(
      enqueueNotification(userId, "nope.not_a_type"),
    ).rejects.toThrow(/unknown notification type/);
  });

  it("enforces the per-user daily cap for non-security mail", async () => {
    const { email } = await authedAgent();
    const userId = await userIdFor(email);

    // 8 already sent today…
    for (let i = 0; i < 8; i++) {
      await prisma.notification.create({
        data: {
          userId,
          type: "money.savings_milestone",
          payload: "{}",
          status: "sent",
          sentAt: new Date(),
        },
      });
    }
    // …so the 9th money email is skipped, but a security one still goes out.
    await enqueueNotification(userId, "money.savings_milestone", { amount: "₹1000" });
    await enqueueNotification(userId, "security.password_changed");
    await drainOutbox();

    const rows = await prisma.notification.findMany({
      where: { userId, status: { in: ["skipped", "sent"] }, sentAt: null },
    });
    const skipped = rows.find((r) => r.type === "money.savings_milestone");
    expect(skipped?.status).toBe("skipped");
    expect(skipped?.error).toBe("daily cap");
    expect(
      outboxDelivered.filter((d) => d.to === email && d.type === "security.password_changed"),
    ).toHaveLength(1);
  });

  it("password reset enqueues the security notification", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);
    const { lastOtpFor } = await import("./helpers.js");

    await agent.post("/api/auth/forgot").send({ email }).expect(200);
    await agent
      .post("/api/auth/reset")
      .send({ email, code: lastOtpFor(email), password: "newpassword456" })
      .expect(200);

    const row = await prisma.notification.findFirst({
      where: { userId, type: "security.password_changed" },
    });
    expect(row).not.toBeNull();
  });

  it("adding an address enqueues the security notification", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);

    await agent
      .post("/api/users/addresses")
      .send({
        label: "home",
        line1: "12 MG Road",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500001",
      })
      .expect(201);

    const row = await prisma.notification.findFirst({
      where: { userId, type: "security.address_added" },
    });
    expect(row).not.toBeNull();
    expect(JSON.parse(row!.payload).label).toBe("home");
  });

  it("cancelling a paid order enqueues the cancellation email", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);
    // Place a food order so there's something cancellable before dispatch.
    const order = await agent
      .post("/api/orders")
      .send({
        domain: "food",
        items: [{ dishId: "masala-dosa", platform: "ondc", qty: 1 }],
      })
      .expect(201);
    const orderId = order.body.order.id as string;

    await agent
      .post(`/api/orders/${orderId}/cancel`)
      .send({ reason: "Changed my mind" })
      .expect(200);

    const row = await prisma.notification.findFirst({
      where: { userId, type: "orders.cancelled" },
    });
    expect(row).not.toBeNull();
    const payload = JSON.parse(row!.payload);
    expect(payload.orderId).toBe(orderId);
    expect(payload.reason).toBe("Changed my mind");
  });

  it("a login after failed attempts enqueues a suspicious-login alert", async () => {
    const { email } = await authedAgent();
    const userId = await userIdFor(email);
    const { default: request } = await import("supertest");
    const { app } = await import("./helpers.js");

    // Two wrong passwords bump failedLogins to 2…
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong-password" })
        .expect(401);
    }
    // …then the correct password gets in → alert fires.
    await request(app)
      .post("/api/auth/login")
      .send({ email, password: "password123" })
      .expect(200);

    const row = await prisma.notification.findFirst({
      where: { userId, type: "security.suspicious_login" },
    });
    expect(row).not.toBeNull();
    expect(JSON.parse(row!.payload).attempts).toBe("2");
  });

  it("activating Plus enqueues a welcome/receipt email", async () => {
    const { agent, email } = await authedAgent();
    const userId = await userIdFor(email);
    await agent.post("/api/subscription/subscribe").expect(200);

    const row = await prisma.notification.findFirst({
      where: { userId, type: "plus.activated" },
    });
    expect(row).not.toBeNull();
  });

  it("the Plus sweep reminds ~3 days out and expires lapsed members once", async () => {
    const { sweepPlusMemberships } = await import(
      "../src/modules/subscription/subscription.service.js"
    );

    // A member renewing in ~3 days.
    const { email: soon } = await authedAgent();
    const soonId = await userIdFor(soon);
    await prisma.user.update({
      where: { id: soonId },
      data: {
        plusActive: true,
        plusSince: new Date(),
        plusUntil: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000),
      },
    });

    // A member whose period already lapsed.
    const { email: gone } = await authedAgent();
    const goneId = await userIdFor(gone);
    await prisma.user.update({
      where: { id: goneId },
      data: {
        plusActive: true,
        plusSince: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        plusUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const first = await sweepPlusMemberships();
    expect(first.reminded).toBeGreaterThanOrEqual(1);
    expect(first.expired).toBeGreaterThanOrEqual(1);

    // Reminder enqueued for the renewing member…
    expect(
      await prisma.notification.count({
        where: { userId: soonId, type: "plus.renewal_reminder" },
      }),
    ).toBe(1);
    // …expiry enqueued and the flag cleared for the lapsed one.
    expect(
      await prisma.notification.count({
        where: { userId: goneId, type: "plus.expired" },
      }),
    ).toBe(1);
    const goneUser = await prisma.user.findUniqueOrThrow({ where: { id: goneId } });
    expect(goneUser.plusActive).toBe(false);

    // Idempotent: a second sweep doesn't re-remind or re-expire the same period.
    await sweepPlusMemberships();
    expect(
      await prisma.notification.count({
        where: { userId: soonId, type: "plus.renewal_reminder" },
      }),
    ).toBe(1);
  });

  it("preferences API round-trips the new toggles", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .put("/api/users/preferences")
      .send({ emailMoneyUpdates: false, emailTips: false })
      .expect(200);
    expect(res.body.emailMoneyUpdates).toBe(false);
    expect(res.body.emailTips).toBe(false);
    const get = await agent.get("/api/users/preferences").expect(200);
    expect(get.body.emailMoneyUpdates).toBe(false);
    expect(get.body.emailUpdates).toBe(true);
  });
});
