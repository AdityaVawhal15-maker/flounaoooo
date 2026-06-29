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
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
} from "./apikey.service.js";
import { getConfig, updateConfig } from "./config.service.js";

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

// --- API keys ------------------------------------------------------------
superRouter.get("/api-keys", async (_req, res, next) => {
  try {
    res.json({ keys: await listApiKeys() });
  } catch (err) {
    next(err);
  }
});

superRouter.post(
  "/api-keys",
  validateBody(
    z.object({
      name: z.string().trim().min(2).max(80),
      client: z.string().trim().min(2).max(80),
      scope: z.enum(["read", "read_write"]).default("read"),
      // ISO date string or null; optional expiry.
      expiresAt: z.string().datetime().nullable().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        name: string;
        client: string;
        scope: "read" | "read_write";
        expiresAt?: string | null;
      };
      const created = await createApiKey({
        name: body.name,
        client: body.client,
        scope: body.scope,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdById: req.userId!,
      });
      await auditFromReq(req, {
        action: "apikey.create",
        targetType: "apikey",
        targetId: created.id,
        summary: `Created API key "${body.name}" (${body.client})`,
        metadata: { scope: body.scope, prefix: created.prefix },
      });
      // The raw key is returned ONCE — the client must show it now; it's never
      // retrievable again.
      res.status(201).json({ id: created.id, key: created.rawKey, prefix: created.prefix });
    } catch (err) {
      next(err);
    }
  },
);

superRouter.delete("/api-keys/:id", async (req, res, next) => {
  try {
    const ok = await revokeApiKey(req.params.id!);
    if (!ok) return res.status(404).json({ error: "Not found" });
    await auditFromReq(req, {
      action: "apikey.revoke",
      targetType: "apikey",
      targetId: req.params.id!,
      summary: `Revoked API key ${req.params.id}`,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Platform settings (commission + alert thresholds) ------------------
superRouter.get("/settings", async (_req, res, next) => {
  try {
    res.json(await getConfig());
  } catch (err) {
    next(err);
  }
});

superRouter.patch(
  "/settings",
  validateBody(
    z.object({
      ondcMinMarginBps: z.number().int().min(0).max(10000).optional(),
      ondcMaxMarginBps: z.number().int().min(0).max(10000).optional(),
      partnerAffiliateMinBps: z.number().int().min(0).max(10000).optional(),
      cashbackUserSharePct: z.number().int().min(0).max(100).optional(),
      apiFailureRatePct: z.number().int().min(0).max(100).optional(),
      decisionLatencyAlertSec: z.number().int().min(1).max(120).optional(),
      ondcPingAlertMs: z.number().int().min(10).max(10000).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const patch = req.body as Record<string, number>;
      const updated = await updateConfig(patch, req.userId!);
      await auditFromReq(req, {
        action: "settings.update",
        targetType: "config",
        targetId: "default",
        summary: "Updated platform settings",
        metadata: patch,
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
