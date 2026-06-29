import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens.js";
import { ApiError } from "./error.js";
import { prisma } from "../lib/prisma.js";
import {
  normalizeRole,
  roleSatisfiesAny,
  isOperator,
  type Role,
} from "../lib/rbac.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      // Role from the access token (fast path). Privileged routes additionally
      // re-verify against the DB via requireRole, so a revoked role is enforced
      // on the next request rather than waiting for the token to expire.
      userRole?: Role;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return next(new ApiError(401, "Not authenticated"));
  req.userId = payload.sub;
  req.userRole = normalizeRole((payload as { role?: unknown }).role);
  next();
}

// Gate a privileged route to one or more roles. Security properties:
//  - Requires a valid session first (401 if not authenticated).
//  - Re-reads the CURRENT role + suspension from the DB on every call, so a
//    demotion or suspension takes effect immediately, not when the JWT expires.
//  - Hides the surface from ordinary users: a non-operator who somehow reaches
//    an admin route gets a flat 404, never a 403 — we don't confirm it exists.
//  - Default-deny: any mismatch is rejected.
export function requireRole(...accepted: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.access_token as string | undefined;
      const payload = token ? verifyAccessToken(token) : null;
      if (!payload) return next(new ApiError(401, "Not authenticated"));

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, suspendedAt: true },
      });
      if (!user) return next(new ApiError(401, "Not authenticated"));

      const role = normalizeRole(user.role);

      // Ordinary users (and unknown roles) must not learn the console exists.
      if (!isOperator(role)) return next(new ApiError(404, "Not found"));

      // Suspended operators are locked out entirely.
      if (user.suspendedAt) return next(new ApiError(403, "Account suspended"));

      // Operator, but not one of the accepted roles for THIS route → hide it.
      if (!roleSatisfiesAny(role, accepted)) {
        return next(new ApiError(404, "Not found"));
      }

      // Operator with the right role, but the session hasn't cleared 2FA
      // step-up — require it. A distinct code lets the console UI route to the
      // OTP screen rather than treating this as a hard failure.
      if (!payload.step) {
        return next(new ApiError(403, "Step-up required", "step_up_required"));
      }

      req.userId = user.id;
      req.userRole = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
