// Append-only audit trail for privileged actions. Every mutating admin/super
// operation calls writeAudit(...) so the super-admin has a tamper-evident record
// of who did what, to whom, and from where. There is intentionally no update or
// delete path exposed anywhere — the trail only grows.

import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import { normalizeRole, type Role } from "../../lib/rbac.js";

export type AuditInput = {
  actorId: string | null;
  actorRole: Role;
  action: string; // "user.suspend" | "role.grant" | "order.refund_flag" | ...
  targetType: string; // "user" | "order" | "ticket" | "flag" | "system"
  targetId?: string | null;
  summary: string;
  metadata?: unknown; // serialized to JSON
  ip?: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? undefined,
        summary: input.summary.slice(0, 500),
        metadata:
          input.metadata !== undefined ? JSON.stringify(input.metadata) : undefined,
        ip: input.ip ?? undefined,
      },
    });
  } catch {
    // Auditing must never break the action it records; monitoring still catches
    // the underlying failure if the DB is genuinely down.
  }
}

// Convenience: pull actor identity straight off an authenticated request.
export async function auditFromReq(
  req: Request,
  entry: Omit<AuditInput, "actorId" | "actorRole" | "ip">,
): Promise<void> {
  await writeAudit({
    ...entry,
    actorId: req.userId ?? null,
    actorRole: normalizeRole(req.userRole),
    ip: clientIp(req),
  });
}

// Best-effort client IP, honouring a single proxy hop (we set trust proxy in
// production). Never throws.
export function clientIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.ip ?? null;
}
