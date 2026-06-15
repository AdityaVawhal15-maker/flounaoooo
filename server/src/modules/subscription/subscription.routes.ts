import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { env } from "../../config/env.js";
import {
  activatePlus,
  cancelPlus,
  getPlusStatus,
} from "./subscription.service.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth);

// Current Plus status + price + perk list (drives the upsell screen).
subscriptionRouter.get("/", async (req, res, next) => {
  try {
    res.json(await getPlusStatus(req.userId!));
  } catch (err) {
    next(err);
  }
});

// Start a subscription. With Cashfree configured this would create a recurring
// mandate; until KYC/recurring is live we activate immediately in dev so the
// whole Plus experience is testable end to end. (The charge integration slots
// in here without touching anything downstream.)
subscriptionRouter.post("/subscribe", async (req, res, next) => {
  try {
    const cashfreeConfigured = Boolean(
      env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY,
    );
    // TODO(cashfree): create a recurring subscription/mandate for
    // SUBSCRIPTION_PRICE_PAISE and activate on the success webhook.
    void cashfreeConfigured;
    const status = await activatePlus(req.userId!);
    res.json({ mode: cashfreeConfigured ? "cashfree" : "simulated", status });
  } catch (err) {
    next(err);
  }
});

subscriptionRouter.post("/cancel", async (req, res, next) => {
  try {
    res.json(await cancelPlus(req.userId!));
  } catch (err) {
    next(err);
  }
});
