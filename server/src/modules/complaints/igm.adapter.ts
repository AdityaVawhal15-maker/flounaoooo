import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { recordAction, type ActionCode } from "./complaints.service.js";

// ONDC IGM protocol adapter.
//
// This is the seam the integration guide asks for: the complaint model and the
// UI know nothing about wire format, and everything that touches the network
// lives behind `IgmAdapter`. A spec version bump changes an implementation
// here; it does not reach the database, the API or the screens.
//
// What is deliberately NOT in this file: payload construction. The guide states
// plainly that endpoint URLs, headers, signing, subscriber IDs, context values
// and the JSON schema must come from the live ONDC specification, and that
// inventing enum values or field names is wrong. Guessing them would produce
// issues the network rejects and — worse — code that looks finished. So the
// mapping functions are declared and left unimplemented, with exactly what each
// one needs written down.

/** The four protocol actions from the guide. */
export type IgmAction =
  | "issue"
  | "on_issue"
  | "issue_status"
  | "on_issue_status";

/** A normalised inbound event, already translated out of wire format. */
export type InboundIgmEvent = {
  /** Protocol message id — the idempotency key. */
  messageId: string;
  action: IgmAction;
  /** Our complaint code (e.g. ALG-000123) or the network's issue id. */
  complaintRef: string;
  /** Protocol action id, so a replayed action records once. */
  actionId?: string;
  /** Which of our internal action codes this maps to. */
  code: ActionCode;
  description?: string;
  /** Present when the seller is asking the customer for something. */
  infoRequest?: string;
  /** Proposed resolutions, when the event carries them. */
  resolutions?: {
    resolutionId: string;
    itemId?: string;
    type: string;
    amountPaise?: number;
    description: string;
  }[];
};

export interface IgmAdapter {
  /** True when this adapter can actually reach the network. */
  readonly live: boolean;
  /** Send a complaint as an `issue`. */
  sendIssue(complaintId: string): Promise<{ sent: boolean; reason?: string }>;
  /** Ask the network for the current state of an issue. */
  requestStatus(complaintId: string): Promise<{ sent: boolean; reason?: string }>;
  /**
   * Translate a raw inbound callback into a normalised event.
   *
   * Returns null when the payload cannot be understood, which the webhook
   * treats as a rejection rather than a silent success.
   */
  parseCallback(action: IgmAction, payload: unknown): InboundIgmEvent | null;
}

/**
 * Records what would be sent, and does not pretend to have sent it.
 *
 * This is the adapter in use until the specification and credentials arrive.
 * Outbound messages are persisted as `pending` with the reason, so the message
 * log is already the audit trail ONDC asks to see and nothing has to be
 * back-filled later. Critically, it never marks a message `acked` — the case
 * will not look transmitted when it wasn't.
 */
class PendingSpecAdapter implements IgmAdapter {
  readonly live = false;

  private async queue(complaintId: string, action: IgmAction) {
    const reason =
      "ONDC IGM specification and credentials not configured — see IGM-2.0-implementation-spec.md";
    await prisma.complaintMessage.create({
      data: {
        complaintId,
        direction: "outbound",
        action,
        payload: JSON.stringify({ queued: true, reason }),
        status: "pending",
        error: reason,
      },
    });
    return { sent: false, reason };
  }

  sendIssue(complaintId: string) {
    return this.queue(complaintId, "issue");
  }

  requestStatus(complaintId: string) {
    return this.queue(complaintId, "issue_status");
  }

  parseCallback(): InboundIgmEvent | null {
    // Without the schema there is no honest way to read a real callback.
    return null;
  }
}

/**
 * The real adapter. Intentionally unimplemented.
 *
 * To finish it we need, from the ONDC onboarding environment:
 *   - the IGM spec version being targeted
 *   - gateway/participant endpoint URLs
 *   - subscriber id and signing keys (ed25519), plus the auth header format
 *   - context field values (domain, country, city, bap_id, bap_uri, ttl)
 *   - the controlled enums: issue category, sub-category, action codes,
 *     actor types and resolution types
 *
 * Each method should then: build the payload from our Complaint, sign it,
 * POST it, and persist the exchange to ComplaintMessage. Nothing about the
 * complaint model needs to change for that.
 */
class NetworkIgmAdapter implements IgmAdapter {
  readonly live = true;

  async sendIssue(): Promise<{ sent: boolean; reason?: string }> {
    throw new Error("IGM network adapter is not implemented yet");
  }

  async requestStatus(): Promise<{ sent: boolean; reason?: string }> {
    throw new Error("IGM network adapter is not implemented yet");
  }

  parseCallback(): InboundIgmEvent | null {
    throw new Error("IGM network adapter is not implemented yet");
  }
}

/**
 * The live adapter is selected only when the environment says the integration
 * is configured. Defaulting to the pending adapter means a missing credential
 * degrades to "queued, not sent" rather than to a crash or, worse, to silently
 * dropping a customer's grievance.
 */
export const igmAdapter: IgmAdapter =
  process.env.ONDC_IGM_ENABLED === "true"
    ? new NetworkIgmAdapter()
    : new PendingSpecAdapter();

/**
 * Apply a normalised inbound event to a complaint.
 *
 * Shared by both callbacks. Idempotency is enforced twice over: the message id
 * is unique in the database, and the action id is unique in the trail — so a
 * replayed callback neither logs twice nor advances the case twice, which the
 * guide calls out as a requirement.
 */
export async function applyInboundEvent(
  action: IgmAction,
  event: InboundIgmEvent,
  rawPayload: unknown,
): Promise<{ applied: boolean; reason?: string }> {
  const complaint = await prisma.complaint.findFirst({
    where: {
      OR: [{ code: event.complaintRef }, { ondcIssueId: event.complaintRef }],
    },
    select: { id: true },
  });
  if (!complaint) return { applied: false, reason: "unknown complaint" };

  // Idempotency at the transport layer: same protocol message, once.
  const seen = await prisma.complaintMessage.findUnique({
    where: { messageId: event.messageId },
    select: { id: true },
  });
  if (seen) return { applied: false, reason: "duplicate message" };

  await prisma.complaintMessage.create({
    data: {
      complaintId: complaint.id,
      direction: "inbound",
      action,
      messageId: event.messageId,
      payload: JSON.stringify(rawPayload),
      status: "acked",
      receivedAt: new Date(),
    },
  });

  if (event.infoRequest) {
    await prisma.complaint.update({
      where: { id: complaint.id },
      data: { infoRequestedAt: new Date(), infoRequest: event.infoRequest },
    });
  }

  for (const r of event.resolutions ?? []) {
    // Resolutions can be replayed too; the protocol id keeps them unique.
    await prisma.complaintResolution.upsert({
      where: { resolutionId: r.resolutionId },
      create: {
        complaintId: complaint.id,
        resolutionId: r.resolutionId,
        itemId: r.itemId,
        type: r.type,
        amountPaise: r.amountPaise,
        description: r.description,
      },
      update: {},
    });
  }

  // Idempotency at the case layer: same action id, recorded once.
  await recordAction({
    complaintId: complaint.id,
    code: event.code,
    description: event.description,
    actionBy: "SELLER-NP",
    actionId: event.actionId,
  });

  return { applied: true };
}

/** Whether inbound callbacks may be trusted in this environment. */
export function callbackVerificationConfigured() {
  return Boolean(process.env.ONDC_SIGNING_PUBLIC_KEY);
}

/**
 * Verify an inbound callback's signature.
 *
 * Fails closed. Until the signing scheme is configured this returns false in
 * production, so an unverified request can never mutate a complaint — an open
 * webhook that anyone could POST a resolution to would be a far worse bug than
 * an unfinished integration. Development and test are allowed through so the
 * flow can be exercised locally, and the caller records that it was unverified.
 */
export function verifyCallbackSignature(_headers: unknown, _rawBody: string) {
  if (callbackVerificationConfigured()) {
    // Implement against the ONDC auth header scheme once the keys are issued.
    throw new Error("ONDC signature verification is not implemented yet");
  }
  return env.NODE_ENV !== "production";
}
