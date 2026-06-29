// Role-based access control — the security backbone of the back-office.
//
// The model is deliberately small and default-deny:
//   user        — ordinary customer; no back-office access at all.
//   developer   — diagnostics only (errors, health, flags). No PII money actions.
//   admin       — operations: users, orders, support, analytics.
//   super_admin — admin + staff/role management, revenue, config, audit trail.
//
// Two roles are *hierarchical* (super_admin ⊇ admin). developer is a SIBLING,
// not above or below admin — it has its own scoped capabilities, so we check
// roles explicitly rather than by a single linear rank for the operator tiers.

export const ROLES = ["user", "developer", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : "user";
}

// Any non-user role is an "operator" (may reach the console at all).
export function isOperator(role: Role): boolean {
  return role !== "user";
}

// Does `role` satisfy a requirement for `needed`? super_admin satisfies admin
// (hierarchy); every other requirement must match exactly. This keeps developer
// strictly scoped and prevents an admin from reaching super-only surfaces.
export function roleSatisfies(role: Role, needed: Role): boolean {
  if (role === needed) return true;
  if (needed === "admin" && role === "super_admin") return true;
  return false;
}

// True if `role` meets ANY of the accepted roles (used by the middleware).
export function roleSatisfiesAny(role: Role, accepted: readonly Role[]): boolean {
  return accepted.some((needed) => roleSatisfies(role, needed));
}
