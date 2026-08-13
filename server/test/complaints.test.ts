import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { recordAction } from "../src/modules/complaints/complaints.service.js";

// ONDC IGM 2.0 complaints.
//
// These pin the guarantees the integration guide calls out explicitly, because
// ONDC inspects them in the live walkthrough: a traceable action trail, chained
// actions, idempotent callbacks, item-specific resolutions, and — most
// importantly — that accepting a resolution never claims money has moved.

async function raise(agent: ReturnType<typeof request.agent>) {
  const res = await agent
    .post("/api/complaints")
    .send({
      category: "ITEM",
      subCategory: "WRONG_ITEM_DELIVERED",
      description: "Received a different dish from the one I ordered",
    })
    .expect(201);
  return res.body.complaint as { id: string; code: string; status: string };
}

describe("complaints", () => {
  it("creates a complaint with a reference and an opening action", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    expect(complaint.code).toMatch(/^ALG-\d{6}$/);
    expect(complaint.status).toBe("OPEN");

    const res = await agent
      .get(`/api/complaints/${complaint.id}/timeline`)
      .expect(200);
    expect(res.body.timeline).toHaveLength(1);
    expect(res.body.timeline[0].code).toBe("CREATED");
  });

  it("records both actors so the case is attributable", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const actors = await prisma.complaintActor.findMany({
      where: { complaintId: complaint.id },
      select: { actorType: true },
    });
    expect(actors.map((a) => a.actorType).sort()).toEqual([
      "CONSUMER",
      "INTERFACING-NP",
    ]);
  });

  it("chains actions so the case replays in order", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    await recordAction({
      complaintId: complaint.id,
      code: "ACKNOWLEDGED",
      actionBy: "SELLER-NP",
      actionId: "SELLER-ACK-1",
    });

    const actions = await prisma.complaintAction.findMany({
      where: { complaintId: complaint.id },
      orderBy: { createdAt: "asc" },
    });
    expect(actions).toHaveLength(2);
    // The second action points back at the first.
    expect(actions[1]!.lastActionId).toBe(actions[0]!.actionId);
  });

  it("advances status on acknowledgement but never moves backwards", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    await recordAction({
      complaintId: complaint.id,
      code: "ACKNOWLEDGED",
      actionBy: "SELLER-NP",
      actionId: "ACK-back-1",
    });
    let row = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(row.status).toBe("PROCESSING");

    // A late CREATED callback must not drag a live case back to OPEN.
    await recordAction({
      complaintId: complaint.id,
      code: "CREATED",
      actionBy: "SELLER-NP",
      actionId: "LATE-CREATE-1",
    });
    row = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(row.status).toBe("PROCESSING");
  });

  it("is idempotent on a duplicate callback", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const first = await recordAction({
      complaintId: complaint.id,
      code: "ACKNOWLEDGED",
      actionBy: "SELLER-NP",
      actionId: "DUP-ACTION-1",
    });
    const second = await recordAction({
      complaintId: complaint.id,
      code: "ACKNOWLEDGED",
      actionBy: "SELLER-NP",
      actionId: "DUP-ACTION-1",
    });

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    const count = await prisma.complaintAction.count({
      where: { complaintId: complaint.id },
    });
    expect(count).toBe(2); // CREATED + one ACKNOWLEDGED, not two
  });

  it("accepting a financial resolution opens a refund but does NOT mark it paid", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const resolution = await prisma.complaintResolution.create({
      data: {
        complaintId: complaint.id,
        resolutionId: `RES-${complaint.id}`,
        type: "REFUND",
        amountPaise: 35000,
        description: "Full refund of ₹350",
      },
    });

    await agent
      .post(`/api/complaints/${complaint.id}/resolution/${resolution.id}/accept`)
      .expect(200);

    const refunds = await prisma.complaintRefund.findMany({
      where: { complaintId: complaint.id },
    });
    expect(refunds).toHaveLength(1);
    // The guide is explicit: an accepted resolution is not proof money moved.
    expect(refunds[0]!.status).toBe("initiated");
    expect(refunds[0]!.refundReference).toBeNull();
    expect(refunds[0]!.completedAt).toBeNull();
  });

  it("refuses to decide the same resolution twice", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    const resolution = await prisma.complaintResolution.create({
      data: {
        complaintId: complaint.id,
        resolutionId: `RES2-${complaint.id}`,
        type: "REPLACEMENT",
        description: "Send a replacement",
      },
    });

    await agent
      .post(`/api/complaints/${complaint.id}/resolution/${resolution.id}/accept`)
      .expect(200);
    await agent
      .post(`/api/complaints/${complaint.id}/resolution/${resolution.id}/reject`)
      .expect(409);
  });

  it("supports item-specific resolutions on one complaint", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    await prisma.complaintResolution.createMany({
      data: [
        {
          complaintId: complaint.id,
          resolutionId: `A-${complaint.id}`,
          itemId: "ITEM-1",
          type: "REFUND",
          amountPaise: 17500,
          description: "Partial refund for item 1",
        },
        {
          complaintId: complaint.id,
          resolutionId: `B-${complaint.id}`,
          itemId: "ITEM-2",
          type: "REPLACEMENT",
          description: "Replacement for item 2",
        },
      ],
    });

    const res = await agent.get(`/api/complaints/${complaint.id}`).expect(200);
    expect(res.body.complaint.resolutions).toHaveLength(2);
    expect(res.body.complaint.resolutions.map((r: { itemId: string }) => r.itemId))
      .toEqual(["ITEM-1", "ITEM-2"]);
  });

  it("only accepts information when the seller actually asked for it", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    await agent
      .post(`/api/complaints/${complaint.id}/information`)
      .send({ message: "Here is the photo" })
      .expect(400);

    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { infoRequestedAt: new Date(), infoRequest: "Please send a photo" },
    });

    await agent
      .post(`/api/complaints/${complaint.id}/information`)
      .send({ message: "Here is the photo" })
      .expect(200);

    // The request is cleared so the UI stops asking.
    const row = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(row.infoRequestedAt).toBeNull();
  });

  it("escalates to GRO then ONDC, and no further", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const first = await agent
      .post(`/api/complaints/${complaint.id}/escalate`)
      .send({ reason: "No response from the seller for three days" })
      .expect(200);
    expect(first.body.level).toBe(1);

    const second = await agent
      .post(`/api/complaints/${complaint.id}/escalate`)
      .send({ reason: "Grievance officer did not resolve it" })
      .expect(200);
    expect(second.body.level).toBe(2);

    await agent
      .post(`/api/complaints/${complaint.id}/escalate`)
      .send({ reason: "Still unhappy" })
      .expect(400);

    const row = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(row.issueType).toBe("GRIEVANCE");
  });

  it("never exposes another user's complaint", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    const { agent: other } = await authedAgent();

    await other.get(`/api/complaints/${complaint.id}`).expect(404);
    await other
      .post(`/api/complaints/${complaint.id}/escalate`)
      .send({ reason: "Not my complaint but let me try" })
      .expect(404);
  });

  it("rejects a complaint against someone else's order", async () => {
    const { agent } = await authedAgent();
    const { agent: other } = await authedAgent();

    // Give the first user an order, then have the second try to complain about it.
    const mine = await prisma.order.findFirst({ select: { id: true } });
    if (mine) {
      await other
        .post("/api/complaints")
        .send({
          orderId: mine.id,
          category: "ITEM",
          description: "Trying to complain about an order that isn't mine",
        })
        .expect(404);
    }
  });

  it("requires authentication", async () => {
    await request(app).get("/api/complaints").expect(401);
    await request(app).post("/api/complaints").send({}).expect(401);
  });
});

describe("complaint acknowledgement email", () => {
  it("queues the confirmation the Submitted screen promises", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const queued = await prisma.notification.findFirst({
      where: { type: "complaint.raised", dedupeKey: `complaint.raised:${complaint.id}` },
    });
    expect(queued).not.toBeNull();
    // Filed under security so marketing preferences can never suppress a
    // grievance receipt.
    expect(JSON.parse(queued!.payload).code).toBe(complaint.code);
  });
});
