// Formal grievances.
//
// Support policy 3.7 and privacy policy 10.3. Deliberately not a support
// ticket: a grievance carries a named officer, an independent review, and four
// separate deadlines that we publish. Routing it into the ticket queue would
// lose all four, and the queue is worked by the same people the grievance may
// be about.
//
// The IT Rules require a grievance officer with published contact details and
// fixed timelines, and DPDP requires a route for data complaints. This is the
// machinery behind those commitments, so its deadlines are stored, not implied.

import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { GRIEVANCE_SLA } from "../../lib/policy.js";

export const GRIEVANCE_CATEGORIES = [
  "service",
  "refund",
  "privacy",
  "conduct",
  "other",
] as const;

export type GrievanceCategory = (typeof GRIEVANCE_CATEGORIES)[number];

/**
 * A short reference the customer can quote.
 *
 * Not the row id. A cuid is 25 characters of noise to read down a phone line,
 * and the first thing anyone raising a grievance has to do is tell somebody
 * else which one they mean.
 *
 * Crockford-style alphabet: no I, L, O or U, so it cannot be misread as a
 * digit or spell anything unfortunate.
 */
function reference(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.randomBytes(6);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `GRV-${out}`;
}

/**
 * Files a grievance and fixes its deadlines.
 *
 * Privacy grievances answer to privacy policy 10.3, which allows 45 days to
 * resolve where the support policy allows 30. We apply the stricter of the two
 * in every case: publishing two different deadlines and then choosing the
 * looser one per case is how a company ends up arguing with a regulator about
 * which of its own promises applied.
 */
export async function fileGrievance(input: {
  userId: string;
  category: GrievanceCategory;
  subject: string;
  body: string;
  orderId?: string | null;
}) {
  if (input.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.userId },
      select: { id: true },
    });
    if (!order) return { ok: false as const, reason: "order_not_found" as const };
  }

  const now = Date.now();

  // Retried on collision rather than trusted blindly. Six characters from a
  // 32-symbol alphabet is roughly a billion values, so a clash is unlikely and
  // an unhandled one would fail a person's grievance at the moment of filing.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const grievance = await prisma.grievanceCase.create({
        data: {
          reference: reference(),
          userId: input.userId,
          category: input.category,
          subject: input.subject,
          body: input.body,
          orderId: input.orderId ?? undefined,
          assignBy: new Date(now + GRIEVANCE_SLA.assignMs),
          contactBy: new Date(now + GRIEVANCE_SLA.contactMs),
          investigateBy: new Date(now + GRIEVANCE_SLA.investigateMs),
        },
        select: {
          id: true,
          reference: true,
          status: true,
          assignBy: true,
          contactBy: true,
          investigateBy: true,
          createdAt: true,
        },
      });
      return { ok: true as const, grievance };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err;
    }
  }
  return { ok: false as const, reason: "reference_collision" as const };
}

export async function listGrievances(userId: string) {
  return prisma.grievanceCase.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      category: true,
      subject: true,
      status: true,
      outcome: true,
      assignBy: true,
      contactBy: true,
      investigateBy: true,
      assignedAt: true,
      contactedAt: true,
      resolvedAt: true,
      appealedAt: true,
      appealDueBy: true,
      appealOutcome: true,
      createdAt: true,
    },
  });
}

/**
 * Appeals a resolved grievance. One appeal, decided within 15 days.
 *
 * The policy says "no further internal appeals" after this, so a second
 * attempt is refused here rather than accepted and quietly ignored. Telling
 * someone their appeal was filed when it was not is worse than refusing it.
 */
export async function appealGrievance(userId: string, id: string) {
  const existing = await prisma.grievanceCase.findFirst({
    where: { id, userId },
    select: { id: true, status: true, appealedAt: true },
  });
  if (!existing) return { ok: false as const, reason: "not_found" as const };
  if (existing.appealedAt) {
    return { ok: false as const, reason: "already_appealed" as const };
  }
  if (existing.status !== "resolved") {
    return { ok: false as const, reason: "not_resolved" as const };
  }

  const grievance = await prisma.grievanceCase.update({
    where: { id },
    data: {
      status: "appealed",
      appealedAt: new Date(),
      appealDueBy: new Date(Date.now() + GRIEVANCE_SLA.appealMs),
    },
    select: { id: true, reference: true, status: true, appealDueBy: true },
  });
  return { ok: true as const, grievance };
}

/**
 * Which published deadlines a case has already missed.
 *
 * Computed on read for the same reason the ticket version is: a stored flag
 * would be wrong within the hour, and this is exactly the number somebody will
 * eventually be asked to account for.
 */
export function grievanceBreaches(
  g: {
    assignBy: Date;
    contactBy: Date;
    investigateBy: Date;
    assignedAt: Date | null;
    contactedAt: Date | null;
    resolvedAt: Date | null;
    appealDueBy: Date | null;
    appealOutcome: string | null;
  },
  now = new Date(),
) {
  return {
    assignment: !g.assignedAt && now > g.assignBy,
    contact: !g.contactedAt && now > g.contactBy,
    investigation: !g.resolvedAt && now > g.investigateBy,
    appeal: Boolean(g.appealDueBy && !g.appealOutcome && now > g.appealDueBy),
  };
}
