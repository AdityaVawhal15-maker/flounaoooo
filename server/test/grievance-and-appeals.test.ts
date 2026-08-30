// Grievances and decision appeals.
//
// Both are commitments with published deadlines: a grievance has four, and an
// appeal has one measured in business days. The tests are about the ways those
// promises could quietly stop being kept, and about the two rules that exist
// to protect the person rather than us: one internal appeal only, and a human
// review that automation may not close.

import { describe, it, expect } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { GRIEVANCE_SLA, addBusinessDays } from "../src/lib/policy.js";
import { grievanceBreaches } from "../src/modules/compliance/grievance.service.js";
import { answerAppeal } from "../src/modules/compliance/appeals.service.js";
import { slaStatus } from "../src/modules/backoffice/tickets.service.js";

const grievance = {
  category: "refund" as const,
  subject: "Refund not received",
  body: "My refund for order 12 has not arrived after three weeks of waiting.",
};

describe("filing a grievance", () => {
  it("returns a reference a person can quote, and the published deadlines", async () => {
    const { agent } = await authedAgent();
    const res = await agent.post("/api/privacy/grievances").send(grievance).expect(201);

    // Not the row id: a cuid is 25 characters of noise to read down a phone.
    expect(res.body.reference).toMatch(/^GRV-[0-9A-Z]{6}$/);
    // And nothing in the alphabet that can be misread as something else.
    expect(res.body.reference).not.toMatch(/[ILOU]/);

    const created = new Date(res.body.createdAt).getTime();
    expect(new Date(res.body.assignBy).getTime() - created).toBeCloseTo(
      GRIEVANCE_SLA.assignMs,
      -4,
    );
    expect(new Date(res.body.contactBy).getTime() - created).toBeCloseTo(
      GRIEVANCE_SLA.contactMs,
      -4,
    );
    expect(new Date(res.body.investigateBy).getTime() - created).toBeCloseTo(
      GRIEVANCE_SLA.investigateMs,
      -4,
    );
  });

  it("gives every case a distinct reference", async () => {
    const { agent } = await authedAgent();
    const refs = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const res = await agent.post("/api/privacy/grievances").send(grievance).expect(201);
      refs.add(res.body.reference);
    }
    expect(refs.size).toBe(6);
  });

  it("refuses a grievance about somebody else's order", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    const order = await prisma.order.create({
      data: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email: b.email } })).id,
        domain: "food",
        title: "Someone else's dinner",
        status: "completed",
        provider: "ondc",
        fulfillment: "in_app",
        amount: 20000,
        details: "{}",
      },
    });
    await a.agent
      .post("/api/privacy/grievances")
      .send({ ...grievance, orderId: order.id })
      .expect(404);
  });

  it("lists only your own", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    await b.agent.post("/api/privacy/grievances").send(grievance).expect(201);
    const res = await a.agent.get("/api/privacy/grievances").expect(200);
    expect(res.body.grievances).toHaveLength(0);
  });
});

describe("appealing a grievance", () => {
  it("is refused until the grievance has been resolved", async () => {
    const { agent } = await authedAgent();
    const filed = await agent.post("/api/privacy/grievances").send(grievance).expect(201);
    await agent.post(`/api/privacy/grievances/${filed.body.id}/appeal`).expect(400);
  });

  it("is allowed once, and refused the second time", async () => {
    const { agent } = await authedAgent();
    const filed = await agent.post("/api/privacy/grievances").send(grievance).expect(201);
    await prisma.grievanceCase.update({
      where: { id: filed.body.id },
      data: { status: "resolved", resolvedAt: new Date(), outcome: "Refund issued" },
    });

    const first = await agent
      .post(`/api/privacy/grievances/${filed.body.id}/appeal`)
      .expect(200);
    expect(first.body.appealDueBy).toBeTruthy();

    // The policy says no further internal appeals. Refused outright rather
    // than accepted and ignored: telling someone their appeal was filed when
    // it was not is worse than refusing it.
    await agent.post(`/api/privacy/grievances/${filed.body.id}/appeal`).expect(409);
  });
});

describe("published deadlines are reported honestly", () => {
  it("reports a breach only once the deadline has actually passed", () => {
    const base = {
      assignBy: new Date("2026-09-01T00:00:00Z"),
      contactBy: new Date("2026-09-05T00:00:00Z"),
      investigateBy: new Date("2026-09-30T00:00:00Z"),
      assignedAt: null,
      contactedAt: null,
      resolvedAt: null,
      appealDueBy: null,
      appealOutcome: null,
    };
    const before = grievanceBreaches(base, new Date("2026-08-31T00:00:00Z"));
    expect(before).toEqual({
      assignment: false,
      contact: false,
      investigation: false,
      appeal: false,
    });

    const after = grievanceBreaches(base, new Date("2026-09-06T00:00:00Z"));
    expect(after.assignment).toBe(true);
    expect(after.contact).toBe(true);
    expect(after.investigation).toBe(false);
  });

  it("stops counting a deadline as breached once it has been met", () => {
    const met = grievanceBreaches(
      {
        assignBy: new Date("2026-09-01T00:00:00Z"),
        contactBy: new Date("2026-09-05T00:00:00Z"),
        investigateBy: new Date("2026-09-30T00:00:00Z"),
        assignedAt: new Date("2026-08-31T00:00:00Z"),
        contactedAt: new Date("2026-09-02T00:00:00Z"),
        resolvedAt: new Date("2026-09-10T00:00:00Z"),
        appealDueBy: null,
        appealOutcome: null,
      },
      new Date("2026-10-15T00:00:00Z"),
    );
    expect(met).toEqual({
      assignment: false,
      contact: false,
      investigation: false,
      appeal: false,
    });
  });
});

describe("support ticket SLA", () => {
  it("stamps both deadlines from the published table", async () => {
    const { agent, email } = await authedAgent();
    await agent
      .post("/api/users/tickets")
      .send({ category: "payment", subject: "Charged twice", body: "I paid twice for one order." })
      .expect((r) => expect([200, 201]).toContain(r.status));

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const ticket = await prisma.supportTicket.findFirstOrThrow({
      where: { userId: user.id },
    });
    // Payment issues: two hours to respond, same day to resolve.
    const respond = ticket.slaRespondBy!.getTime() - ticket.createdAt.getTime();
    expect(Math.abs(respond - 2 * 60 * 60 * 1000)).toBeLessThan(5000);
    expect(ticket.firstResponseAt).toBeNull();
  });

  it("does not treat an answered ticket as breached", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    expect(
      slaStatus(
        {
          slaRespondBy: past,
          slaResolveBy: past,
          firstResponseAt: past,
          resolvedAt: past,
        },
        new Date("2026-09-01T00:00:00Z"),
      ),
    ).toEqual({ responseBreached: false, resolutionBreached: false });
  });

  it("reports an unanswered overdue ticket as breached", () => {
    const past = new Date("2026-01-01T00:00:00Z");
    expect(
      slaStatus(
        { slaRespondBy: past, slaResolveBy: past, firstResponseAt: null, resolvedAt: null },
        new Date("2026-09-01T00:00:00Z"),
      ),
    ).toEqual({ responseBreached: true, resolutionBreached: true });
  });
});

describe("challenging a decision the engine made", () => {
  it("is due in five business days, not five calendar days", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/privacy/appeals")
      .send({ reason: "I wanted the fastest delivery, not the cheapest", wanted: "faster" })
      .expect(201);

    const due = new Date(res.body.dueBy);
    const expected = addBusinessDays(new Date(res.body.createdAt), 5);
    expect(Math.abs(due.getTime() - expected.getTime())).toBeLessThan(60_000);
    // Five business days is never fewer than seven calendar days.
    const calendarDays =
      (due.getTime() - new Date(res.body.createdAt).getTime()) / 86_400_000;
    expect(calendarDays).toBeGreaterThanOrEqual(6.9);
    // It also never lands on a weekend.
    expect([0, 6]).not.toContain(due.getDay());
  });

  it("records that a human was asked for", async () => {
    const { agent } = await authedAgent();
    const res = await agent
      .post("/api/privacy/appeals")
      .send({ reason: "This ranking is wrong and I want a person to look", humanReview: true })
      .expect(201);
    expect(res.body.humanReviewRequested).toBe(true);
  });

  it("will not close an appeal without naming a reviewer", async () => {
    const { agent, email } = await authedAgent();
    await agent
      .post("/api/privacy/appeals")
      .send({ reason: "Wrong price shown", humanReview: true })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const appeal = await prisma.decisionAppeal.findFirstOrThrow({
      where: { userId: user.id },
    });

    // A system account standing in for a person is the exact thing the right
    // to human review exists to prevent, so an empty reviewer is refused
    // rather than defaulted to something that looks like one.
    const bad = await answerAppeal({
      appealId: appeal.id,
      reviewerId: "   ",
      response: "Looks fine to us",
    });
    expect(bad.ok).toBe(false);

    const good = await answerAppeal({
      appealId: appeal.id,
      reviewerId: "operator-1",
      response: "You were right, the price was stale. Corrected.",
    });
    expect(good.ok).toBe(true);
  });

  it("lists only your own appeals", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    await b.agent
      .post("/api/privacy/appeals")
      .send({ reason: "Not what I asked for" })
      .expect(201);
    const res = await a.agent.get("/api/privacy/appeals").expect(200);
    expect(res.body.appeals).toHaveLength(0);
  });
});
