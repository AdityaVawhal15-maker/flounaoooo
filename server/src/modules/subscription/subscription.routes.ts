import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { env, isProd } from "../../config/env.js";
import { ApiError } from "../../middleware/error.js";
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

// Start a subscription. Plus is NEVER granted without a verified charge: when
// Cashfree is configured (or whenever we're in production), the paid path must
// go through the gateway and activate only from the verified success webhook —
// so we return "not available yet" until that mandate flow is implemented.
// Direct activation below is a dev-only convenience for when Cashfree is unset
// in a non-prod environment, so the whole Plus experience stays testable.
subscriptionRouter.post("/subscribe", async (req, res, next) => {
  try {
    const cashfreeConfigured = Boolean(
      env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY,
    );
    if (cashfreeConfigured || isProd) {
      // TODO(cashfree): create the recurring subscription/mandate for
      // SUBSCRIPTION_PRICE_PAISE, return the payment session, and call
      // activatePlus(userId) from the PAYMENT_SUCCESS webhook — never here.
      throw new ApiError(503, "Subscription checkout is not available yet");
    }

    // Dev-only simulated activation (Cashfree unconfigured, non-prod).
    const status = await activatePlus(req.userId!);
    res.json({ mode: "simulated", status });
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
