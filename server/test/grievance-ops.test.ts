// Working a grievance from the operator's side.
//
// These are the four published deadlines, so the tests are about the ways the
// record could stop being trustworthy: a clock restarted by a handover, a case
// concluded twice, a second appeal accepted, or an appeal answered by nobody in
// particular.

import { describe, it, expect } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { GRIEVANCE_SLA } from "../src/lib/policy.js";
import {
  assignOfficer,
  concludeGrievance,
  decideAppeal,
  grievanceQueue,
  nextObligation,
  openAppeal,
  recordContact,
} from "../src/modules/complaints/grievance.ops.js";
import { createComplaint } from "../src/modules/complaints/complaints.service.js";

async function newCase() {
  const { email } = await authedAgent();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const complaint = await createComplaint({
    userId: user.id,
    category: "ITEM",
    subCategory: "ITEM_DAMAGED",
    description: "The container was open and half of it had spilled.",
  });
  return { userId: user.id, id: complaint.id };
}

describe("a new case carries the published deadlines", () => {
  it("stamps all three when it is raised", async () => {
    const { id } = await newCase();
    const c = await prisma.complaint.findUniqueOrThrow({ where: { id } });
    expect(c.assignBy).toBeInstanceOf(Date);
    expect(c.contactBy).toBeInstanceOf(Date);
    expect(c.investigateBy).toBeInstanceOf(Date);
    const from = c.createdAt.getTime();
    expect(c.assignBy!.getTime() - from).toBeCloseTo(GRIEVANCE_SLA.assignMs, -4);
    expect(c.contactBy!.getTime() - from).toBeCloseTo(GRIEVANCE_SLA.contactMs, -4);
    expect(c.investigateBy!.getTime() - from).toBeCloseTo(GRIEVANCE_SLA.investigateMs, -4);
  });
});

describe("what is owed next", () => {
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

  it("walks the steps in order as each is met", () => {
    const now = new Date("2026-08-31T00:00:00Z");
    expect(nextObligation(base, now).label).toBe("Assign an officer");
    expect(nextObligation({ ...base, assignedAt: now }, now).label).toBe(
      "Contact the customer",
    );
    expect(
      nextObligation({ ...base, assignedAt: now, contactedAt: now }, now).label,
    ).toBe("Conclude the investigation");
    expect(
      nextObligation(
        { ...base, assignedAt: now, contactedAt: now, resolvedAt: now },
        now,
      ).label,
    ).toBe("Nothing outstanding");
  });

  it("puts a live appeal ahead of everything else", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    const appealed = {
      ...base,
      assignedAt: now,
      contactedAt: now,
      resolvedAt: now,
      appealDueBy: new Date("2026-10-10T00:00:00Z"),
    };
    expect(nextObligation(appealed, now).label).toBe("Decide appeal");
  });

  it("only calls something overdue once its date has passed", () => {
    expect(nextObligation(base, new Date("2026-08-31T00:00:00Z")).overdue).toBe(false);
    expect(nextObligation(base, new Date("2026-09-02T00:00:00Z")).overdue).toBe(true);
  });
});

describe("assigning and contacting", () => {
  it("records who is handling it and when", async () => {
    const { id } = await newCase();
    const g = await assignOfficer(id, "officer@algorithec.ai");
    expect(g.officerId).toBe("officer@algorithec.ai");
    expect(g.assignedAt).toBeInstanceOf(Date);
    expect(g.status).toBe("PROCESSING");
  });

  it("does not restart the clock when the case is handed to somebody else", async () => {
    const { id } = await newCase();
    const first = await assignOfficer(id, "one@algorithec.ai");
    const at = first.assignedAt!.getTime();

    // A handover a week later must not erase the fact that we assigned it on
    // time, or every reassignment would quietly repair a missed deadline.
    await new Promise((r) => setTimeout(r, 20));
    const second = await assignOfficer(id, "two@algorithec.ai");
    expect(second.officerId).toBe("two@algorithec.ai");
    expect(second.assignedAt!.getTime()).toBe(at);
  });

  it("treats contact as proof the case was assigned", async () => {
    const { id } = await newCase();
    // Somebody rings the customer without ever pressing assign. The case must
    // not then report an assignment breach forever, which is untrue and would
    // sit at the top of the queue misdirecting whoever works it.
    const g = await recordContact(id);
    expect(g.contactedAt).toBeInstanceOf(Date);
    expect(g.assignedAt).toBeInstanceOf(Date);
  });
});

describe("concluding", () => {
  it("writes the outcome and closes the three clocks", async () => {
    const { id } = await newCase();
    const g = await concludeGrievance(id, "Refund issued in full and the seller was warned.");
    expect(g.resolvedAt).toBeInstanceOf(Date);
    expect(g.status).toBe("RESOLVED");
    expect(g.assignedAt).toBeInstanceOf(Date);
    expect(g.contactedAt).toBeInstanceOf(Date);
    expect(nextObligation(g).label).toBe("Nothing outstanding");
  });

  it("refuses to conclude the same case twice", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Refund issued.");
    await expect(concludeGrievance(id, "Refund issued again.")).rejects.toThrow();
  });
});

describe("the one internal appeal", () => {
  it("cannot be opened before the case is concluded", async () => {
    const { id } = await newCase();
    await expect(openAppeal(id)).rejects.toThrow();
  });

  it("opens once, with a fifteen day deadline", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Nothing owed, the item matched the order.");
    const g = await openAppeal(id);
    expect(g.appealedAt).toBeInstanceOf(Date);
    const window = g.appealDueBy!.getTime() - g.appealedAt!.getTime();
    expect(Math.abs(window - GRIEVANCE_SLA.appealMs)).toBeLessThan(5000);
  });

  it("refuses a second appeal", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Nothing owed.");
    await openAppeal(id);
    // The policy says no further internal appeals. Refused rather than
    // accepted and ignored.
    await expect(openAppeal(id)).rejects.toThrow();
  });

  it("is decided once, and not again", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Nothing owed.");
    await openAppeal(id);
    const decided = await decideAppeal(id, "Upheld on review, refund issued.");
    expect(decided.appealOutcome).toMatch(/Upheld/);
    expect(decided.status).toBe("CLOSED");
    await expect(decideAppeal(id, "Changed our mind.")).rejects.toThrow();
  });
});

describe("the queue", () => {
  it("puts anything overdue at the top", async () => {
    const a = await newCase();
    const b = await newCase();
    // Push one case's deadlines into the past.
    await prisma.complaint.update({
      where: { id: b.id },
      data: {
        assignBy: new Date(Date.now() - 86_400_000),
        contactBy: new Date(Date.now() - 86_400_000),
        investigateBy: new Date(Date.now() - 86_400_000),
      },
    });

    const queue = await grievanceQueue();
    const ids = queue.map((q) => q.id);
    expect(ids).toContain(a.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    expect(queue[0]!.next.overdue).toBe(true);
  });

  it("leaves settled cases out unless they are asked for", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Resolved and refunded.");
    const open = await grievanceQueue();
    expect(open.map((q) => q.id)).not.toContain(id);
    const all = await grievanceQueue({ includeSettled: true });
    expect(all.map((q) => q.id)).toContain(id);
  });

  it("keeps a case in the queue while its appeal is undecided", async () => {
    const { id } = await newCase();
    await concludeGrievance(id, "Nothing owed.");
    await openAppeal(id);
    // Resolved, but still owed an answer. Dropping it here is how an appeal
    // deadline gets missed by a queue that looks empty.
    const open = await grievanceQueue();
    expect(open.map((q) => q.id)).toContain(id);
  });
});
