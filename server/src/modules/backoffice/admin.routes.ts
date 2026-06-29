// Admin (operations) console API. Scoped to the `admin` role — and super_admin
// satisfies it via the hierarchy. Read models for users/orders/analytics plus a
// small set of audited, money-safe mutations (suspend a user, flag a refund,
// work the support queue). No secrets, no role changes (that's super-admin only).

import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { auditFromReq } from "./audit.service.js";
import {
  searchUsers,
  getUserDetail,
  setUserSuspended,
  listOrders,
  flagRefund,
  adminAnalytics,
} from "./admin.service.js";
import {
  listTickets,
  getTicket,
  updateTicket,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
} from "./tickets.service.js";
import {
  dashboardSummary,
  cityReport,
  vendorReport,
  decisionLogs,
  couponStats,
  priceAlertsOverview,
  gmvByDomain,
} from "./reporting.service.js";

export const adminRouter = Router();
adminRouter.use(requireRole("admin")); // super_admin satisfies admin

// --- Reporting dashboards (founder's admin view) ------------------------
adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    res.json(await dashboardSummary());
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/reports/gmv-by-domain", async (_req, res, next) => {
  try {
    res.json({ domains: await gmvByDomain() });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/cities", async (_req, res, next) => {
  try {
    res.json(await cityReport());
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/vendors", async (_req, res, next) => {
  try {
    res.json(await vendorReport());
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/decisions", async (_req, res, next) => {
  try {
    res.json(await decisionLogs(50));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/coupons", async (_req, res, next) => {
  try {
    res.json(await couponStats());
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/price-alerts", async (_req, res, next) => {
  try {
    res.json(await priceAlertsOverview());
  } catch (err) {
    next(err);
  }
});

// --- Analytics -----------------------------------------------------------
adminRouter.get("/analytics", async (_req, res, next) => {
  try {
    res.json(await adminAnalytics());
  } catch (err) {
    next(err);
  }
});

// --- Users ---------------------------------------------------------------
adminRouter.get("/users", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    res.json(await searchUsers({ q, page }));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users/:id", async (req, res, next) => {
  try {
    const detail = await getUserDetail(req.params.id!);
    if (!detail) return res.status(404).json({ error: "Not found" });
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  "/users/:id/suspend",
  validateBody(z.object({ suspended: z.boolean() })),
  async (req, res, next) => {
    try {
      const { suspended } = req.body as { suspended: boolean };
      const result = await setUserSuspended(req.params.id!, suspended);
      if (!result.ok) {
        // Don't let an admin suspend a fellow operator from here.
        const code = result.reason === "not_found" ? 404 : 403;
        return res.status(code).json({ error: result.reason });
      }
      await auditFromReq(req, {
        action: suspended ? "user.suspend" : "user.reinstate",
        targetType: "user",
        targetId: req.params.id!,
        summary: `${suspended ? "Suspended" : "Reinstated"} user ${req.params.id}`,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// --- Orders --------------------------------------------------------------
adminRouter.get("/orders", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const domain = typeof req.query.domain === "string" ? req.query.domain : undefined;
    const page = Number(req.query.page) || 1;
    res.json(await listOrders({ status, domain, page }));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/orders/:id/flag-refund", async (req, res, next) => {
  try {
    const result = await flagRefund(req.params.id!);
    if (!result.ok) {
      const code = result.reason === "not_found" ? 404 : 409;
      return res.status(code).json({ error: result.reason });
    }
    await auditFromReq(req, {
      action: "order.flag_refund",
      targetType: "order",
      targetId: req.params.id!,
      summary: `Flagged refund for "${result.title}"`,
      metadata: { userId: result.userId },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Support tickets -----------------------------------------------------
adminRouter.get("/tickets", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const page = Number(req.query.page) || 1;
    res.json(await listTickets({ status, page }));
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/tickets/:id", async (req, res, next) => {
  try {
    const ticket = await getTicket(req.params.id!);
    if (!ticket) return res.status(404).json({ error: "Not found" });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  "/tickets/:id",
  validateBody(
    z.object({
      status: z.enum(TICKET_STATUSES).optional(),
      priority: z.enum(TICKET_PRIORITIES).optional(),
      resolution: z.string().max(2000).optional(),
      assignToMe: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        status?: string;
        priority?: string;
        resolution?: string;
        assignToMe?: boolean;
      };
      const updated = await updateTicket(req.params.id!, {
        status: body.status,
        priority: body.priority,
        resolution: body.resolution,
        ...(body.assignToMe ? { assigneeId: req.userId! } : {}),
      });
      if (!updated) return res.status(404).json({ error: "Not found" });
      await auditFromReq(req, {
        action: "ticket.update",
        targetType: "ticket",
        targetId: req.params.id!,
        summary: `Updated ticket ${req.params.id}${body.status ? ` → ${body.status}` : ""}`,
        metadata: body,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
