// The operator endpoints behind the grievance and appeal queues.
//
// The service layer is tested elsewhere. This is about the wiring: that the
// routes exist, that they are shut to everybody who is not an operator, and
// that the reviewer recorded against an appeal is the person who was signed in
// rather than anything the caller could put in the request.

import { describe, it, expect } from "vitest";
import { app, authedAgent, consoleAgent } from "./helpers.js";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { createComplaint } from "../src/modules/complaints/complaints.service.js";

async function caseFor(userId: string) {
  return createComplaint({
    userId,
    category: "ITEM",
    subCategory: "ITEM_DAMAGED",
    description: "Arrived crushed and leaking down the side of the bag.",
  });
}

describe("the grievance queue is closed to everyone but operators", () => {
  it("hides itself from a signed-out caller", async () => {
    await request(app).get("/api/console/admin/grievances").expect(401);
  });

  it("hides itself from an ordinary signed-in customer", async () => {
    const { agent } = await authedAgent();
    // 404 rather than 403: a customer should not learn the console exists.
    await agent.get("/api/console/admin/grievances").expect(404);
    await agent.get("/api/console/admin/appeals").expect(404);
  });
});

describe("an operator can work a case through its deadlines", () => {
  it("assigns, contacts, concludes, and the queue follows", async () => {
    const customer = await authedAgent();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: customer.email },
    });
    const complaint = await caseFor(user.id);
    const ops = await consoleAgent("admin");

    const queued = await ops.agent.get("/api/console/admin/grievances").expect(200);
    const row = queued.body.grievances.find(
      (g: { id: string }) => g.id === complaint.id,
    );
    expect(row).toBeTruthy();
    expect(row.next.label).toBe("Assign an officer");

    await ops.agent
      .post(`/api/console/admin/grievances/${complaint.id}/assign`)
      .send({ officerId: "officer@algorithec.ai" })
      .expect(200);

    await ops.agent
      .post(`/api/console/admin/grievances/${complaint.id}/contacted`)
      .expect(200);

    const mid = await ops.agent.get("/api/console/admin/grievances").expect(200);
    const midRow = mid.body.grievances.find(
      (g: { id: string }) => g.id === complaint.id,
    );
    expect(midRow.next.label).toBe("Conclude the investigation");

    await ops.agent
      .post(`/api/console/admin/grievances/${complaint.id}/conclude`)
      .send({ outcome: "Refund issued in full and the seller was warned." })
      .expect(200);

    // Settled cases leave the default queue.
    const after = await ops.agent.get("/api/console/admin/grievances").expect(200);
    expect(
      after.body.grievances.some((g: { id: string }) => g.id === complaint.id),
    ).toBe(false);

    // And the customer sees the conclusion on their own case.
    const mine = await customer.agent.get("/api/complaints").expect(200);
    const theirs = mine.body.complaints.find(
      (c: { id: string }) => c.id === complaint.id,
    );
    expect(theirs.resolvedAt).toBeTruthy();
  });

  it("refuses an empty outcome rather than concluding with nothing", async () => {
    const customer = await authedAgent();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: customer.email },
    });
    const complaint = await caseFor(user.id);
    const ops = await consoleAgent("admin");
    await ops.agent
      .post(`/api/console/admin/grievances/${complaint.id}/conclude`)
      .send({ outcome: "" })
      .expect(400);
  });
});

describe("answering a decision appeal", () => {
  it("records the signed-in operator, not a name from the request", async () => {
    const customer = await authedAgent();
    await customer.agent
      .post("/api/privacy/appeals")
      .send({ reason: "I asked for the fastest, it gave me the cheapest", humanReview: true })
      .expect(201);

    const ops = await consoleAgent("admin");
    const queue = await ops.agent.get("/api/console/admin/appeals").expect(200);
    const appeal = queue.body.appeals[0];
    expect(appeal).toBeTruthy();
    // The one that asked for a person sorts to the top.
    expect(appeal.humanReviewRequested).toBe(true);

    // A reviewer supplied by the caller is refused outright, so the recorded
    // reviewer can only ever be whoever was actually signed in. A name the
    // request could set is not evidence a person looked at anything.
    await ops.agent
      .post(`/api/console/admin/appeals/${appeal.id}/answer`)
      .send({ response: "Looked at it, you were right.", reviewerId: "somebody-else" })
      .expect(400);

    await ops.agent
      .post(`/api/console/admin/appeals/${appeal.id}/answer`)
      .send({ response: "Looked at it, you were right. Ranking corrected." })
      .expect(200);

    const stored = await prisma.decisionAppeal.findUniqueOrThrow({
      where: { id: appeal.id },
    });
    const operator = await prisma.user.findUniqueOrThrow({
      where: { email: ops.email },
    });
    expect(stored.reviewerId).toBe(operator.id);
    expect(stored.status).toBe("answered");
    expect(stored.respondedAt).toBeInstanceOf(Date);

    // And the customer can see the answer on their own appeal.
    const mine = await customer.agent.get("/api/privacy/appeals").expect(200);
    expect(mine.body.appeals[0].response).toMatch(/you were right/);
  });
});
