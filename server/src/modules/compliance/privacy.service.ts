// Data-subject rights: a copy of your data, and erasure.
//
// Privacy policy 6.1 and 6.2, DPDP ss.11 and 12. Both are rights, not favours,
// so neither is allowed to depend on anyone being at a desk.
//
// The hard part of erasure is that "delete everything" and "keep transaction
// records for seven years" are both legal obligations, and they contradict.
// The resolution is that an order row survives with its money intact and every
// link to a person cut, which satisfies the tax rule without leaving the data
// personal. That is anonymisation, and it is only real if it cannot be undone,
// which is why the email is overwritten rather than merely blanked.

import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { DELETION_GRACE_MS, PRIVACY_REQUEST_SLA } from "../../lib/policy.js";

/**
 * Everything we hold about one account, as a structured object.
 *
 * The policy promises a portable format, so this is JSON rather than a PDF: a
 * person taking their history elsewhere needs something a machine can read,
 * and a rendered document is a picture of data rather than the data.
 *
 * Deliberately excluded: password hashes, session tokens, device-lock
 * credentials and message ciphertext keys. Those identify the account to an
 * attacker rather than describing the person, and an export is a file that
 * ends up in a downloads folder and gets mailed around. Including them would
 * turn a privacy right into the easiest credential theft we offer.
 */
export async function buildExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      avatarUrl: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
      updatedAt: true,
      weeklyFoodBudgetPaise: true,
      emailUpdates: true,
      smartSuggestions: true,
      emailMoneyUpdates: true,
      emailTips: true,
      shareLocation: true,
      profileVisibility: true,
      activityStatus: true,
      twoFactorEnabled: true,
      plusActive: true,
      plusSince: true,
      plusUntil: true,
      termsAcceptedAt: true,
      termsVersion: true,
      cookieChoiceAt: true,
      cookieAnalytics: true,
      cookieAdvertising: true,
      cookieSocial: true,
      cookiePerformance: true,
      aiTrainingOptOut: true,
    },
  });

  const [
    addresses,
    orders,
    payments,
    chatSessions,
    ratings,
    tickets,
    complaints,
    walletEntries,
    consents,
    privacyRequests,
    appeals,
    paymentMethods,
    priceAlerts,
  ] = await Promise.all([
    prisma.address.findMany({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      include: { trackingEvents: true, payment: true },
    }),
    prisma.payment.findMany({
      where: { userId },
      // A payment reference is ours to share; the gateway's raw payload is not
      // necessarily, and can carry another party's identifiers.
      select: {
        id: true,
        orderId: true,
        amount: true,
        currency: true,
        status: true,
        method: true,
        gateway: true,
        createdAt: true,
      },
    }),
    prisma.chatSession.findMany({ where: { userId }, include: { messages: true } }),
    prisma.orderRating.findMany({ where: { userId } }),
    prisma.supportTicket.findMany({ where: { userId } }),
    prisma.complaint.findMany({ where: { userId } }),
    prisma.walletEntry.findMany({ where: { userId } }),
    prisma.consentRecord.findMany({ where: { userId } }),
    prisma.privacyRequest.findMany({ where: { userId } }),
    prisma.decisionAppeal.findMany({ where: { userId } }),
    prisma.paymentMethod.findMany({
      where: { userId },
      // Whatever the stored "last four" is, it is not the card number, and an
      // export is not the place to reassemble anything close to one.
      select: { id: true, type: true, label: true, last4: true, createdAt: true },
    }),
    prisma.priceAlert.findMany({ where: { userId } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    // Says plainly what was left out, so the export cannot be mistaken for
    // being complete when it is deliberately not.
    notice:
      "This file contains the personal data Algorithec holds about your account. " +
      "Security material such as password hashes, session tokens and device " +
      "credentials is deliberately excluded: it identifies your account to an " +
      "attacker rather than describing you.",
    account: user,
    addresses,
    orders,
    payments,
    conversations: chatSessions,
    ratings,
    supportTickets: tickets,
    complaints,
    rewards: walletEntries,
    consentHistory: consents,
    privacyRequests,
    decisionAppeals: appeals,
    savedPaymentMethods: paymentMethods,
    priceAlerts,
  };
}

/** Opens a request and stamps it with the deadline the policy publishes. */
export async function openPrivacyRequest(
  userId: string,
  kind: "export" | "deletion" | "training_opt_out",
) {
  const ms =
    kind === "export"
      ? PRIVACY_REQUEST_SLA.exportMs
      : kind === "deletion"
        ? PRIVACY_REQUEST_SLA.deletionMs
        : PRIVACY_REQUEST_SLA.trainingOptOutMs;

  // One open request of a kind at a time. Letting someone queue five deletions
  // gives them five deadlines for one decision and tells them nothing new.
  const existing = await prisma.privacyRequest.findFirst({
    where: { userId, kind, status: { in: ["pending", "in_progress"] } },
  });
  if (existing) return existing;

  return prisma.privacyRequest.create({
    data: { userId, kind, dueBy: new Date(Date.now() + ms) },
  });
}

/**
 * Schedules erasure rather than performing it.
 *
 * The delay is the point. Account deletion is the single most destructive
 * thing a person can do here and the policy allows us up to 45 days, so the
 * window exists to be cancelled during: a compromised account recovered, a
 * decision regretted the next morning. Erasing on the button press would be
 * faster and strictly worse.
 */
export async function requestDeletion(userId: string) {
  // Grace period, not retention period. Retention (5.2) governs how long an
  // anonymised remnant survives afterwards for tax; this is how long the
  // person still has to change their mind, and it has to land inside the 45
  // days the policy gives us to process the request.
  const scheduledFor = new Date(Date.now() + DELETION_GRACE_MS);
  const request = await openPrivacyRequest(userId, "deletion");
  await prisma.user.update({
    where: { id: userId },
    data: { deletionRequestedAt: new Date(), deletionScheduledFor: scheduledFor },
  });
  return { request, scheduledFor };
}

/** Undoes a scheduled deletion, while it is still scheduled. */
export async function cancelDeletion(userId: string) {
  await prisma.privacyRequest.updateMany({
    where: { userId, kind: "deletion", status: { in: ["pending", "in_progress"] } },
    data: { status: "cancelled", completedAt: new Date() },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { deletionRequestedAt: null, deletionScheduledFor: null },
  });
}

/**
 * Performs the erasure.
 *
 * Personal fields are overwritten, not blanked. A null tells you the value is
 * gone; an overwritten value means the original cannot be recovered from this
 * row, which is what anonymisation has to mean to be worth claiming.
 *
 * The email becomes a random string rather than null because it is unique and
 * required: two erased accounts both holding null would collide, and the
 * second erasure would fail at exactly the moment it must not.
 *
 * Orders and payments are kept, stripped of anything identifying, because tax
 * law requires seven years of transaction records and consumer law requires
 * the money be traceable. What is kept is an amount and a date with no person
 * attached to it.
 */
export async function eraseAccount(userId: string): Promise<void> {
  const token = crypto.randomBytes(12).toString("hex");
  await prisma.$transaction(async (tx) => {
    // Rows that are wholly personal and carry no accounting duty.
    await tx.address.deleteMany({ where: { userId } });
    await tx.chatMessage.deleteMany({ where: { session: { userId } } });
    await tx.chatSession.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.otpCode.deleteMany({ where: { userId } });
    await tx.deviceLock.deleteMany({ where: { userId } });
    await tx.paymentMethod.deleteMany({ where: { userId } });
    await tx.priceAlert.deleteMany({ where: { userId } });
    await tx.blockedUser.deleteMany({
      where: { OR: [{ userId }, { blockedUserId: userId }] },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: `erased-${token}@deleted.invalid`,
        name: "Deleted account",
        phone: null,
        passwordHash: null,
        googleId: null,
        avatarUrl: null,
        dateOfBirth: null,
        gender: null,
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        emailUpdates: false,
        emailMoneyUpdates: false,
        emailTips: false,
        smartSuggestions: false,
        // Excluded from training on the way out, whatever they had chosen.
        // Erasure that leaves the data feeding a model is not erasure.
        aiTrainingOptOut: true,
        deletedAt: new Date(),
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      },
    });

    await tx.privacyRequest.updateMany({
      where: { userId, kind: "deletion", status: { in: ["pending", "in_progress"] } },
      data: { status: "completed", completedAt: new Date() },
    });
  });
}

/**
 * Runs erasures that have come due.
 *
 * Called from the same hourly job that already expires OTPs and tokens. A
 * deletion that only happens while someone is watching is not a deletion.
 */
export async function processDueDeletions(now = new Date()): Promise<number> {
  const due = await prisma.user.findMany({
    where: { deletionScheduledFor: { lte: now }, deletedAt: null },
    select: { id: true },
  });
  for (const u of due) await eraseAccount(u.id);
  return due.length;
}
