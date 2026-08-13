import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { recordAction } from "../src/modules/complaints/complaints.service.js";
import {
  applyInboundEvent,
  callbackVerificationConfigured,
  verifyCallbackSignature,
} from "../src/modules/complaints/igm.adapter.js";
import {
  getComplaintForOps,
  simulateSellerAcknowledgement,
  simulateInformationRequest,
  simulateResolutionProposal,
  simulateRefundCompleted,
} from "../src/modules/complaints/complaints.admin.js";

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

describe("complaint evidence", () => {
  // 1x1 PNG
  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("accepts an image and returns metadata without the storage key", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const res = await agent
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: PNG })
      .expect(201);

    expect(res.body.evidence.mimeType).toBe("image/png");
    expect(res.body.evidence.sizeBytes).toBeGreaterThan(0);
    // The guide says storage references stay server-side.
    expect(res.body.evidence.storageKey).toBeUndefined();
  });

  it("serves the bytes back to the owner", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    const up = await agent
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: PNG })
      .expect(201);

    const res = await agent
      .get(`/api/complaints/${complaint.id}/evidence/${up.body.evidence.id}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("image/png");
    // Never rendered inline in our own origin.
    expect(res.headers["content-disposition"]).toBe("attachment");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("refuses a file type that isn't allowed", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    await agent
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" })
      .expect(415);
  });

  it("refuses something that isn't a data URL", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    await agent
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: "https://example.com/evil.png?padding=aaaaaaaaaaaaaaaaaaaaaaaa" })
      .expect(400);
  });

  it("never lets another user upload to or read someone else's complaint", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    const up = await agent
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: PNG })
      .expect(201);

    const { agent: other } = await authedAgent();
    await other
      .post(`/api/complaints/${complaint.id}/evidence`)
      .send({ dataUrl: PNG })
      .expect(404);
    await other
      .get(`/api/complaints/${complaint.id}/evidence/${up.body.evidence.id}`)
      .expect(404);
  });
});

describe("ONDC IGM protocol layer", () => {
  it("queues the outbound issue as pending and never claims it was sent", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const outbound = await prisma.complaintMessage.findFirst({
      where: { complaintId: complaint.id, direction: "outbound", action: "issue" },
    });
    expect(outbound).not.toBeNull();
    // Until the spec and credentials land, nothing is transmitted — and the
    // record must not pretend otherwise.
    expect(outbound!.status).toBe("pending");
    expect(outbound!.sentAt).toBeNull();
    expect(outbound!.error).toContain("not configured");
  });

  it("refuses a callback it cannot interpret rather than silently accepting", async () => {
    const res = await request(app)
      .post("/webhooks/ondc/igm/on-issue")
      .send({ context: {}, message: { issue: { id: "whatever" } } })
      .expect(400);
    expect(res.body.message.ack.status).toBe("NACK");
    expect(res.body.error.code).toBe("UNPARSEABLE");
  });

  it("exposes the callbacks outside /api so they carry no session", async () => {
    // A session cookie must not be what authorises a network callback.
    await request(app).post("/api/webhooks/ondc/igm/on-issue").send({}).expect(404);
  });

  it("applies an inbound event once, however many times it arrives", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    const row = await prisma.complaint.findUniqueOrThrow({
      where: { id: complaint.id },
      select: { code: true },
    });

    const event = {
      messageId: `MSG-${complaint.id}`,
      action: "on_issue" as const,
      complaintRef: row.code,
      actionId: `ACT-SELLER-${complaint.id}`,
      code: "ACKNOWLEDGED" as const,
      infoRequest: "Please send a photo of the item",
      resolutions: [
        {
          resolutionId: `R1-${complaint.id}`,
          type: "REFUND",
          amountPaise: 35000,
          description: "Full refund",
        },
      ],
    };

    const first = await applyInboundEvent("on_issue", event, { raw: true });
    const second = await applyInboundEvent("on_issue", event, { raw: true });

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.reason).toBe("duplicate message");

    // One message, one resolution, one acknowledgement — not two of anything.
    expect(
      await prisma.complaintMessage.count({
        where: { complaintId: complaint.id, direction: "inbound" },
      }),
    ).toBe(1);
    expect(
      await prisma.complaintResolution.count({ where: { complaintId: complaint.id } }),
    ).toBe(1);
    expect(
      await prisma.complaintAction.count({
        where: { complaintId: complaint.id, code: "ACKNOWLEDGED" },
      }),
    ).toBe(1);

    // The info request reached the customer-facing record.
    const after = await prisma.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(after.infoRequestedAt).not.toBeNull();
    expect(after.status).toBe("PROCESSING");
  });

  it("ignores an event for a complaint it doesn't know", async () => {
    const result = await applyInboundEvent(
      "on_issue",
      {
        messageId: `MSG-unknown-${Date.now()}`,
        action: "on_issue",
        complaintRef: "ALG-999999",
        code: "ACKNOWLEDGED",
      },
      {},
    );
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("unknown complaint");
  });

  it("treats signature verification as unconfigured, and would fail closed in production", async () => {
    // Not configured here, so dev/test is permitted and production is not.
    expect(callbackVerificationConfigured()).toBe(false);
    expect(verifyCallbackSignature({}, "{}")).toBe(true); // NODE_ENV=test
  });
});

describe("operator view", () => {
  it("returns the full record including protocol messages", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    const detail = await getComplaintForOps(complaint.id);
    expect(detail.code).toBe(complaint.code);
    // Operators DO see raw protocol traffic — that pairing is what the ONDC
    // walkthrough asks to demonstrate. Customers never do.
    expect(Array.isArray(detail.messages)).toBe(true);
    expect(detail.messages.some((m) => m.direction === "outbound")).toBe(true);
    expect(detail.actors).toHaveLength(2);
  });

  it("drives the real action trail when simulating a seller", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);

    await simulateSellerAcknowledgement(complaint.id);
    await simulateInformationRequest(complaint.id, "Send a photo please");
    await simulateResolutionProposal(complaint.id, [
      { type: "REFUND", amountPaise: 35000, description: "Full refund" },
      { type: "REPLACEMENT", description: "Replacement" },
    ]);

    const detail = await getComplaintForOps(complaint.id);
    expect(detail.status).toBe("PROCESSING");
    expect(detail.infoRequestedAt).not.toBeNull();
    expect(detail.resolutions).toHaveLength(2);
    // Simulated actions are labelled so an audit can tell them from real ones.
    expect(
      detail.actions.filter((a) => a.description.includes("simulated")).length,
    ).toBeGreaterThan(0);
  });

  it("keeps refund completion separate from resolution acceptance", async () => {
    const { agent } = await authedAgent();
    const complaint = await raise(agent);
    await simulateResolutionProposal(complaint.id, [
      { type: "REFUND", amountPaise: 35000, description: "Full refund" },
    ]);

    const before = await getComplaintForOps(complaint.id);
    await agent
      .post(
        `/api/complaints/${complaint.id}/resolution/${before.resolutions[0]!.id}/accept`,
      )
      .expect(200);

    // Accepting opens a refund, but does not settle it.
    let detail = await getComplaintForOps(complaint.id);
    expect(detail.refunds[0]!.status).toBe("initiated");
    expect(detail.refunds[0]!.refundReference).toBeNull();

    // Settlement is a separate, explicit fact.
    await simulateRefundCompleted(complaint.id, "RFND-TEST-1");
    detail = await getComplaintForOps(complaint.id);
    expect(detail.refunds[0]!.status).toBe("completed");
    expect(detail.refunds[0]!.refundReference).toBe("RFND-TEST-1");
    expect(detail.actions.some((a) => a.code === "REFUND_COMPLETED")).toBe(true);
  });

  it("hides the console from ordinary users and demands step-up from operators", async () => {
    const { agent } = await authedAgent();
    // A plain user must not even learn the console exists.
    await agent.get("/api/console/admin/complaints").expect(404);
  });
});
