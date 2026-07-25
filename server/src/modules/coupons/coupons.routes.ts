import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { evaluateCoupon, listOfferedCoupons } from "./coupons.service.js";

export const couponsRouter = Router();
couponsRouter.use(requireAuth);

// Codes the buyer can actually use, for the "available offers" list.
couponsRouter.get("/", async (req, res, next) => {
  try {
    const domain = req.query.domain === "ride" ? "ride" : "food";
    res.json({ coupons: await listOfferedCoupons(domain) });
  } catch (err) {
    next(err);
  }
});

// Preview a code against a subtotal before checkout. This is advisory only —
// the order route re-evaluates the code when the order is actually created, so
// a stale or tampered preview can never set the final price.
couponsRouter.post(
  "/validate",
  validateBody(
    z.object({
      code: z.string().trim().min(2).max(24),
      domain: z.enum(["food", "ride"]).default("food"),
      subtotalPaise: z.number().int().min(0).max(10_000_000),
    }),
  ),
  async (req, res, next) => {
    try {
      const { code, domain, subtotalPaise } = req.body as {
        code: string;
        domain: "food" | "ride";
        subtotalPaise: number;
      };
      const result = await evaluateCoupon({
        code,
        userId: req.userId!,
        domain,
        subtotalPaise,
      });
      if (!result.ok) return res.status(400).json({ error: result.reason });
      res.json({
        code: result.code,
        description: result.description,
        discountPaise: result.discountPaise,
      });
    } catch (err) {
      next(err);
    }
  },
);
