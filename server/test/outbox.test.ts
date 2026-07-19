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
