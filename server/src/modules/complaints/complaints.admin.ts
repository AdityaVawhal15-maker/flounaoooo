import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error.js";
import { env } from "../../config/env.js";
import { recordAction } from "./complaints.service.js";

// Operator view of ONDC IGM complaints.
//
// The live walkthrough asks us to show the backend complaint record and the
// corresponding ONDC message log beside whatever the customer sees, so the
// verifier can connect every customer-facing event to a stored record. That is
// what this module serves.
//
// Unlike the customer API, raw protocol payloads ARE included here — operators
// are the audience the guide intends them for. They still never reach the app.

export async function listComplaintsForOps(opts: { status?: string } = {}) {
  return prisma.complaint.findMany({
    where: opts.status ? { status: opts.status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      status: true,
      category: true,
      subCategory: true,
      orderId: true,
      escalationLevel: true,
      infoRequestedAt: true,
      createdAt: true,
      ondcIssueId: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { actions: true, messages: true, resolutions: true } },
    },
  });
}

/** Everything about one case, including the protocol traffic. */
export async function getComplaintForOps(id: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      actors: true,
      actions: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      resolutions: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { initiatedAt: "asc" } },
      escalations: { orderBy: { createdAt: "asc" } },
      evidence: {
        select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
  });
  if (!complaint) throw new ApiError(404, "Complaint not found");
  return { ...complaint, itemIds: JSON.parse(complaint.itemIds) as string[] };
}

/**
 * Rehearsal helpers for the ONDC walkthrough.
 *
 * Without network credentials there is no Seller NP to respond, so the demo
 * cannot be practised end to end. These stand in for the inbound callbacks:
 * they write exactly what a real `on_issue` would write, through the same
 * action trail, so what the verifier sees is the genuine mechanism rather than
 * a mock screen.
 *
 * Refused outright in production. A control that can fabricate a resolution —
 * and therefore a refund — must not exist on a live system, and the guide's
 * warning against representing an IGM message as proof of settlement applies
 * doubly to something we generated ourselves. Every simulated action is also
 * tagged in its description so an audit can tell it apart from a real one.
 */
function assertSimulationAllowed() {
  if (env.NODE_ENV === "production") {
    throw new ApiError(
      403,
      "Seller simulation is disabled in production — connect a real Seller NP",
    );
  }
}

export async function simulateSellerAcknowledgement(complaintId: string) {
  assertSimulationAllowed();
  return recordAction({
    complaintId,
    code: "ACKNOWLEDGED",
    description: "Received by the seller (simulated)",
    actionBy: "SELLER-NP",
    actionId: `SIM-ACK-${complaintId}`,
  });
}

export async function simulateInformationRequest(
  complaintId: string,
  message: string,
) {
  assertSimulationAllowed();
  await prisma.complaint.update({
    where: { id: complaintId },
    data: { infoRequestedAt: new Date(), infoRequest: message },
  });
  return recordAction({
    complaintId,
    code: "INFO_REQUESTED",
    description: `Seller asked: ${message} (simulated)`,
    actionBy: "SELLER-NP",
    actionId: `SIM-INFO-${complaintId}-${Date.now()}`,
  });
}

/**
 * Propose resolutions. Modelled as a list because IGM 2.0 allows several, and
 * different ones per item — the walkthrough script suggests offering two.
 */
export async function simulateResolutionProposal(
  complaintId: string,
  proposals: {
    itemId?: string;
    type: string;
    amountPaise?: number;
    description: string;
  }[],
) {
  assertSimulationAllowed();
  for (const [i, p] of proposals.entries()) {
    await prisma.complaintResolution.upsert({
      where: { resolutionId: `SIM-RES-${complaintId}-${i}` },
      create: {
        complaintId,
        resolutionId: `SIM-RES-${complaintId}-${i}`,
        itemId: p.itemId,
        type: p.type,
        amountPaise: p.amountPaise,
        description: p.description,
      },
      update: {},
    });
  }
  return recordAction({
    complaintId,
    code: "RESOLUTION_PROPOSED",
    description: `Seller proposed ${proposals.length} resolution${proposals.length > 1 ? "s" : ""} (simulated)`,
    actionBy: "SELLER-NP",
    actionId: `SIM-RESPROP-${complaintId}-${Date.now()}`,
  });
}

/**
 * Mark a refund settled.
 *
 * Separate from accepting a resolution on purpose. Acceptance records a
 * decision; this records money actually moving, with its reference — the
 * separation the guide insists on, preserved even in the rehearsal path.
 */
export async function simulateRefundCompleted(
  complaintId: string,
  reference: string,
) {
  assertSimulationAllowed();
  const refund = await prisma.complaintRefund.findFirst({
    where: { complaintId, status: { not: "completed" } },
    orderBy: { initiatedAt: "asc" },
  });
  if (!refund) throw new ApiError(404, "No pending refund on this complaint");

  await prisma.complaintRefund.update({
    where: { id: refund.id },
    data: {
      status: "completed",
      refundReference: reference,
      completedAt: new Date(),
    },
  });
  return recordAction({
    complaintId,
    code: "REFUND_COMPLETED",
    description: `Refund ${reference} completed (simulated)`,
    actionBy: "INTERFACING-NP",
    actionId: `SIM-REFUND-${refund.id}`,
  });
}
