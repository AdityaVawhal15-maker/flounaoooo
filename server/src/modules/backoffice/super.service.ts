// Super-admin service — the only place operator roles are granted or revoked,
// plus revenue dashboards, config visibility and the full audit viewer.
//
// Role changes are the highest-stakes action in the system, so the guards here
// are deliberate:
//   - Only a super_admin reaches this module (enforced by the route).
//   - You cannot lock everyone out: the LAST active super_admin can't be demoted
//     or suspended, so there's always at least one operator who can recover.
//   - You cannot demote or suspend YOURSELF — prevents an accidental self-lockout
//     and forces a second super_admin to make that change deliberately.

import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { ROLES, type Role } from "../../lib/rbac.js";

// --- Staff / operators ---------------------------------------------------

export async function listOperators() {
  const operators = await prisma.user.findMany({
    where: { role: { not: "user" } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      suspendedAt: true,
      createdAt: true,
    },
  });
  return operators.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    role: o.role,
    suspended: Boolean(o.suspendedAt),
    createdAt: o.createdAt,
  }));
}

type RoleResult =
  | { ok: true; previous: Role; next: Role }
  | { ok: false; reason: "not_found" | "self" | "last_super_admin" | "invalid_role" };

async function activeSuperAdminCount(excludeId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      role: "super_admin",
      suspendedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

// Grant or change an operator role. `actorId` is the super_admin making the
// change; we use it to block self-demotion.
export async function setOperatorRole(
  actorId: string,
  targetId: string,
  nextRole: string,
): Promise<RoleResult> {
  if (!(ROLES as readonly string[]).includes(nextRole)) {
    return { ok: false, reason: "invalid_role" };
  }
  const role = nextRole as Role;

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, suspendedAt: true },
  });
  if (!target) return { ok: false, reason: "not_found" };

  // Don't let a super_admin change their own role (prevents self-lockout; a
  // second super_admin must do it deliberately).
  if (targetId === actorId && role !== "super_admin") {
    return { ok: false, reason: "self" };
  }

  // Demoting the target away from super_admin: ensure another active one remains.
  if (target.role === "super_admin" && role !== "super_admin") {
    const others = await activeSuperAdminCount(targetId);
    if (others === 0) return { ok: false, reason: "last_super_admin" };
  }

  await prisma.user.update({ where: { id: targetId }, data: { role } });
  return { ok: true, previous: target.role as Role, next: role };
}

type SuspendResult =
  | { ok: true; suspended: boolean }
  | { ok: false; reason: "not_found" | "self" | "last_super_admin" | "not_operator" };

// Suspend or reinstate an OPERATOR account (ordinary-user suspension lives in the
// admin module). Same last-super-admin and self guards apply.
export async function setOperatorSuspended(
  actorId: string,
  targetId: string,
  suspended: boolean,
): Promise<SuspendResult> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, reason: "not_found" };
  if (target.role === "user") return { ok: false, reason: "not_operator" };
  if (targetId === actorId && suspended) return { ok: false, reason: "self" };

  if (suspended && target.role === "super_admin") {
    const others = await activeSuperAdminCount(targetId);
    if (others === 0) return { ok: false, reason: "last_super_admin" };
  }

  await prisma.user.update({
    where: { id: targetId },
    data: { suspendedAt: suspended ? new Date() : null },
  });
  return { ok: true, suspended };
}

// --- Revenue / subscriptions --------------------------------------------

export async function revenueDashboard() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const paid = { status: { in: ["confirmed", "in_progress", "completed"] } };

  const [
    grossAgg,
    gross30Agg,
    byDomain,
    plusActive,
    refundsPending,
    refundedAgg,
  ] = await Promise.all([
    prisma.order.aggregate({ where: paid, _sum: { amount: true } }),
    prisma.order.aggregate({
      where: { ...paid, createdAt: { gte: since30 } },
      _sum: { amount: true },
    }),
    prisma.order.groupBy({
      by: ["domain"],
      where: paid,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { plusActive: true } }),
    prisma.payment.count({ where: { status: "refund_pending" } }),
    prisma.payment.aggregate({
      where: { status: "refunded" },
      _sum: { amount: true },
    }),
  ]);

  // Radiues Plus is ₹50/mo — model recurring run-rate from active subscribers.
  const planPaise = env.SUBSCRIPTION_PRICE_PAISE;

  return {
    grossPaise: grossAgg._sum.amount ?? 0,
    gross30dPaise: gross30Agg._sum.amount ?? 0,
    byDomain: Object.fromEntries(
      byDomain.map((d) => [
        d.domain,
        { grossPaise: d._sum.amount ?? 0, orders: d._count._all },
      ]),
    ),
    subscriptions: {
      activePlus: plusActive,
      monthlyRunRatePaise: plusActive * planPaise,
      planPaise,
    },
    refunds: {
      pending: refundsPending,
      refundedPaise: refundedAgg._sum.amount ?? 0,
    },
  };
}

// --- Config status (no secret values, only configured-or-not) ------------

export function configStatus() {
  const set = (v?: string) => Boolean(v && v.length > 0);
  return {
    runtime: {
      nodeEnv: env.NODE_ENV,
      providerMode: env.PROVIDER_MODE, // simulation | ondc
      llmProvider: env.LLM_PROVIDER,
    },
    secrets: {
      database: set(env.DATABASE_URL),
      jwtAccess: set(env.JWT_ACCESS_SECRET),
      jwtRefresh: set(env.JWT_REFRESH_SECRET),
      anthropic: set(env.ANTHROPIC_API_KEY),
      googleAi: set(env.GOOGLE_AI_API_KEY),
      smtp: set(env.SMTP_HOST),
      cashfree: set(env.CASHFREE_APP_ID) && set(env.CASHFREE_SECRET_KEY),
      googleOauth: set(env.GOOGLE_CLIENT_ID) && set(env.GOOGLE_CLIENT_SECRET),
      webPush: set(env.VAPID_PUBLIC_KEY) && set(env.VAPID_PRIVATE_KEY),
      sentry: set(env.SENTRY_DSN),
      ondc: set(env.ONDC_SUBSCRIBER_ID) && set(env.ONDC_SIGNING_PRIVATE_KEY),
    },
  };
}

// --- Full audit viewer ---------------------------------------------------

export async function auditPage(opts: { action?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const size = 50;
  const where = opts.action ? { action: opts.action } : {};
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * size,
      take: size,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total, page, pageSize: size };
}
