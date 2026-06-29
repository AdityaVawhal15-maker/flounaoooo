// Support / Issue-&-Grievance tickets. Users raise them (often about an order);
// admins work the queue. Modelled close to ONDC's IGM so the same flow maps onto
// the network's grievance API once we're a registered participant.

import { prisma } from "../../lib/prisma.js";

export const TICKET_CATEGORIES = [
  "order",
  "payment",
  "refund",
  "account",
  "other",
] as const;
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const PAGE = 25;

// --- User side -----------------------------------------------------------

export async function createTicket(input: {
  userId: string;
  orderId?: string | null;
  category: (typeof TICKET_CATEGORIES)[number];
  subject: string;
  body: string;
}) {
  // If an order is referenced, it must belong to the user — never let someone
  // raise a ticket against an order that isn't theirs.
  if (input.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, userId: input.userId },
      select: { id: true },
    });
    if (!order) return { ok: false as const, reason: "order_not_found" as const };
  }
  // Refund/payment issues skew urgent; everything else is normal by default.
  const priority =
    input.category === "refund" || input.category === "payment" ? "high" : "normal";

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId,
      orderId: input.orderId ?? undefined,
      category: input.category,
      subject: input.subject,
      body: input.body,
      priority,
    },
    select: { id: true, status: true, priority: true, createdAt: true },
  });
  return { ok: true as const, ticket };
}

export async function listUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      resolution: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// --- Admin side ----------------------------------------------------------

export async function listTickets(opts: { status?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.status ? { status: opts.status } : {};

  const [rows, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      // Open/urgent first, then most recent.
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        priority: true,
        orderId: true,
        assigneeId: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return { tickets: rows, total, page, pageSize: PAGE };
}

export async function getTicket(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateTicket(
  id: string,
  data: { status?: string; priority?: string; assigneeId?: string | null; resolution?: string },
) {
  const updated = await prisma.supportTicket
    .update({ where: { id }, data })
    .catch(() => null);
  return updated;
}
