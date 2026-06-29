// Super-admin console API — the top tier. Scoped to super_admin only (no
// hierarchy grants this). Manages operators & roles, revenue, config visibility
// and the full audit trail. Role/suspension changes carry self-lockout and
// last-super-admin guards in the service; every action is audited here.

import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { auditFromReq } from "./audit.service.js";
import { ROLES } from "../../lib/rbac.js";
import {
  listOperators,
  setOperatorRole,
  setOperatorSuspended,
  revenueDashboard,
  configStatus,
  auditPage,
} from "./super.service.js";

export const superRouter = Router();
superRouter.use(requireRole("super_admin"));

// Map a service refusal reason to an HTTP status + message.
function refusal(reason: string): { code: number; error: string } {
  switch (reason) {
    case "not_found":
      return { code: 404, error: "Not found" };
    case "self":
      return { code: 409, error: "You cannot change your own access here." };
    case "last_super_admin":
      return { code: 409, error: "Cannot remove the last active super-admin." };
    case "not_operator":
      return { code: 400, error: "Not an operator account." };
    case "invalid_role":
      return { code: 400, error: "Invalid role." };
    default:
      return { code: 400, error: "Action refused." };
  }
}

// --- Operators / roles ---------------------------------------------------
superRouter.get("/operators", async (_req, res, next) => {
  try {
    res.json({ operators: await listOperators() });
  } catch (err) {
    next(err);
  }
});

superRouter.patch(
  "/operators/:id/role",
  validateBody(z.object({ role: z.enum(ROLES) })),
  async (req, res, next) => {
    try {
      const { role } = req.body as { role: string };
      const result = await setOperatorRole(req.userId!, req.params.id!, role);
      if (!result.ok) {
        const r = refusal(result.reason);
        return res.status(r.code).json({ error: r.error });
      }
      await auditFromReq(req, {
        action: "role.set",
        targetType: "user",
        targetId: req.params.id!,
        summary: `Changed role of ${req.params.id} from "${result.previous}" to "${result.next}"`,
        metadata: { previous: result.previous, next: result.next },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

superRouter.patch(
  "/operators/:id/suspend",
  validateBody(z.object({ suspended: z.boolean() })),
  async (req, res, next) => {
    try {
      const { suspended } = req.body as { suspended: boolean };
      const result = await setOperatorSuspended(
        req.userId!,
        req.params.id!,
        suspended,
      );
      if (!result.ok) {
        const r = refusal(result.reason);
        return res.status(r.code).json({ error: r.error });
      }
      await auditFromReq(req, {
        action: suspended ? "operator.suspend" : "operator.reinstate",
        targetType: "user",
        targetId: req.params.id!,
        summary: `${suspended ? "Suspended" : "Reinstated"} operator ${req.params.id}`,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// --- Revenue & config (read-only) ---------------------------------------
superRouter.get("/revenue", async (_req, res, next) => {
  try {
    res.json(await revenueDashboard());
  } catch (err) {
    next(err);
  }
});

superRouter.get("/config", (_req, res) => {
  res.json(configStatus());
});

// --- Full audit viewer ---------------------------------------------------
superRouter.get("/audit", async (req, res, next) => {
  try {
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const page = Number(req.query.page) || 1;
    res.json(await auditPage({ action, page }));
  } catch (err) {
    next(err);
  }
});
