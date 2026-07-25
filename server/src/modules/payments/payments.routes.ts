import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { env, isProd } from "../../config/env.js";
import {
  cashfreeConfigured,
  createCashfreeOrder,
  getCashfreeOrder,
  verifyCashfreeWebhook,
} from "./cashfree.js";
import { sendPushToUser } from "../notifications/push.service.js";
import { checkSavingsMilestone } from "../notifications/outbox.service.js";
import { sendReceiptEmail } from "../../lib/mailer.js";
import { emitOrderConfirmation } from "../backoffice/ondc.service.js";

export const paymentsRouter = Router();

// Seeded after successful payment so tracking has a live timeline.
const FOOD_EVENTS = [
  { status: "order_placed", message: "Order placed — restaurant notified" },
  { status: "preparing", message: "Restaurant is preparing your food" },
  { status: "out_for_delivery", message: "Delivery partner picked up your order" },
  { status: "arriving", message: "Your order is arriving soon" },
];

const RIDE_EVENTS = [
  { status: "driver_assigned", message: "Driver assigned and on the way" },
  { status: "arriving", message: "Your driver is arriving at pickup" },
  { status: "in_ride", message: "Ride started — enjoy the trip" },
];

async function markPaid(
  orderId: string,
  method: string,
  opts: {
    paidPaise?: number;
    gatewayResponse?: string;
    // Cash on delivery: the order is confirmed and goes into fulfilment, but
    // no money has moved yet — the payment stays pending until collected.
    collectOnDelivery?: boolean;
  } = {},
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "pending_payment") return order;

  // Amount integrity: never confirm an order for less than it costs. The
  // gateway is the source of truth for what was actually charged.
  if (opts.paidPaise !== undefined && opts.paidPaise < order.amount) {
    await prisma.payment.updateMany({
      where: { orderId },
      data: { status: "failed", gatewayResponse: opts.gatewayResponse },
    });
    console.error(
      `[payments] amount mismatch on ${orderId}: paid ${opts.paidPaise} < owed ${order.amount}`,
    );
    return order;
  }

  // Scheduled rides anchor their timeline at the scheduled time — the captain
  // search starts then, not at payment. Everything else starts now.
  let timelineStart = Date.now();
  if (order.domain === "ride") {
    const details = JSON.parse(order.details) as { scheduledAt?: string };
    const scheduled = details.scheduledAt ? Date.parse(details.scheduledAt) : NaN;
    if (!Number.isNaN(scheduled) && scheduled > timelineStart) timelineStart = scheduled;
  }

  // Claim the order and write the payment + timeline in ONE transaction. The
  // status-scoped claim is what makes this exactly-once: only the first
  // concurrent PAYMENT_SUCCESS delivery flips it out of pending_payment, and a
  // duplicate sees count === 0 and aborts. Keeping the claim inside the
  // transaction means a failure anywhere (e.g. a webhook arriving for an order
  // that never went through checkout, so no payment row exists) rolls the
  // claim back too — an order can never end up "confirmed" with no payment and
  // no tracking events. The payment row is upserted for exactly that case.
  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { id: orderId, status: "pending_payment" },
      data: { status: "confirmed" },
    });
    if (claim.count === 0) return false;

    // COD money hasn't moved yet, so the payment row must not claim success.
    const paymentStatus = opts.collectOnDelivery ? "pending" : "success";

    await tx.payment.upsert({
      where: { orderId },
      update: { status: paymentStatus, method, gatewayResponse: opts.gatewayResponse },
      create: {
        orderId,
        userId: order.userId,
        amount: order.amount,
        currency: "INR",
        status: paymentStatus,
        method,
        gatewayResponse: opts.gatewayResponse,
      },
    });

    await tx.trackingEvent.createMany({
      data: (order.domain === "food" ? FOOD_EVENTS : RIDE_EVENTS).map((e, i) => ({
        orderId,
        status: e.status,
        message: e.message,
        // Future timestamps simulate live progress for the tracking screen.
        createdAt: new Date(timelineStart + i * 45_000),
      })),
    });
    return true;
  });

  if (!claimed) {
    return prisma.order.findUnique({ where: { id: orderId } });
  }

  const updated = await prisma.order.findUnique({ where: { id: orderId } });

  // Fire-and-forget receipt email (no-op if SMTP isn't configured or the
  // user has turned off email updates — OTP/security mail is unaffected).
  void prisma.user
    .findUnique({
      where: { id: order.userId },
      select: { email: true, emailUpdates: true },
    })
    .then((u) => {
      if (u?.emailUpdates && updated) {
        return sendReceiptEmail(u.email, {
          id: updated.id,
          title: updated.title,
          domain: updated.domain,
          amount: updated.amount,
          savedPaise: updated.savedPaise,
        });
      }
    })
    .catch((err) => console.error("[payments] receipt email failed:", err));

  // Savings milestone — emails once when the lifetime total crosses ₹500/1k/5k.
  void checkSavingsMilestone(order.userId).catch(() => {});

  // Fire-and-forget confirmation push (no-op if push isn't configured).
  void sendPushToUser(order.userId, {
    title: order.domain === "food" ? "Order confirmed 🍽️" : "Ride booked 🚕",
    body:
      order.domain === "food"
        ? `${order.title} is being prepared.`
        : `${order.title} — your driver is on the way.`,
    url: `/orders/${order.id}`,
  });

  // Record the simulated ONDC confirm/status flow for the developer viewer.
  void emitOrderConfirmation(order);

  return updated;
}

// ---------- Cashfree webhook (no auth — verified by signature) ----------
// The JSON parser's verify hook preserves the exact request bytes on
// req.rawBody; the HMAC is computed over those.
paymentsRouter.post(
  "/webhook/cashfree",
  async (req, res) => {
    const signature = req.header("x-webhook-signature") ?? "";
    const timestamp = req.header("x-webhook-timestamp") ?? "";
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody?.toString("utf8") ?? "";

    if (!verifyCashfreeWebhook(rawBody, signature, timestamp)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    try {
      const event = JSON.parse(rawBody) as {
        type?: string;
        data?: {
          order?: { order_id?: string; order_amount?: number };
          payment?: {
            payment_status?: string;
            payment_group?: string;
            payment_amount?: number;
          };
        };
      };
      const orderId = event.data?.order?.order_id;
      if (
        event.type === "PAYMENT_SUCCESS_WEBHOOK" &&
        orderId &&
        event.data?.payment?.payment_status === "SUCCESS"
      ) {
        // Cashfree reports rupees; we store paise. Use the captured payment
        // amount (falls back to the order amount) to verify integrity.
        const paidRupees =
          event.data.payment.payment_amount ?? event.data.order?.order_amount;
        const paidPaise =
          paidRupees !== undefined ? Math.round(paidRupees * 100) : undefined;
        await markPaid(orderId, event.data.payment.payment_group ?? "upi", {
          paidPaise,
          gatewayResponse: rawBody,
        });
      }
      res.json({ ok: true });
    } catch {
      res.status(400).json({ error: "Malformed webhook" });
    }
  },
);

paymentsRouter.use(requireAuth);

// ---------- checkout ----------

paymentsRouter.post(
  "/checkout",
  validateBody(
    z.object({
      orderId: z.string().cuid(),
      // Cash on delivery collects money in person — it must never open an
      // online gateway. Anything else goes through Cashfree (or the simulated
      // path when no keys are configured).
      method: z.enum(["upi", "card", "cash"]).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { orderId, method } = req.body as {
        orderId: string;
        method?: "upi" | "card" | "cash";
      };
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: req.userId! },
        include: { user: true },
      });
      if (!order) throw new ApiError(404, "Order not found");
      if (order.status !== "pending_payment") {
        throw new ApiError(409, "This order is not awaiting payment");
      }

      await prisma.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          userId: req.userId!,
          amount: order.amount,
          status: "created",
        },
        update: { status: "created" },
      });

      // ---- cash on delivery: confirm the order, collect the money later ----
      if (method === "cash") {
        await markPaid(orderId, "cash", { collectOnDelivery: true });
        return res.json({ mode: "cash", amount: order.amount });
      }

      if (cashfreeConfigured) {
        let cf;
        try {
          cf = await createCashfreeOrder({
            orderId,
            amountPaise: order.amount,
            customerId: order.userId,
            customerEmail: order.user.email,
            customerPhone: order.user.phone ?? "",
            returnUrl: `${env.WEB_ORIGIN}/pay/${orderId}?from=cashfree`,
          });
        } catch (err) {
          // Retried checkout: the order already exists at Cashfree — reuse its
          // still-valid payment session instead of failing the retry.
          if ((err as { cfStatus?: number }).cfStatus === 409) {
            cf = await getCashfreeOrder(orderId);
          } else {
            throw err;
          }
        }
        await prisma.payment.update({
          where: { orderId },
          data: { gatewayOrderId: cf.cf_order_id, status: "processing" },
        });
        return res.json({
          mode: "cashfree",
          paymentSessionId: cf.payment_session_id,
          cfEnv: env.CASHFREE_ENV,
          amount: order.amount,
        });
      }

      res.json({ mode: "simulated", amount: order.amount });
    } catch (err) {
      next(err);
    }
  },
);

// Simulated success — only exists while Cashfree keys are absent, never in prod.
paymentsRouter.post(
  "/simulate",
  validateBody(z.object({ orderId: z.string().cuid(), method: z.enum(["upi", "card"]) })),
  async (req, res, next) => {
    try {
      if (cashfreeConfigured || isProd) {
        throw new ApiError(403, "Simulated payments are disabled");
      }
      const { orderId, method } = req.body as { orderId: string; method: string };
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: req.userId! },
      });
      if (!order) throw new ApiError(404, "Order not found");
      const updated = await markPaid(orderId, method);
      res.json({ order: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Verify-on-return: when the buyer lands back from the Cashfree checkout, the
// client calls this and WE ask Cashfree for the authoritative order state —
// payment confirmation never depends on the client's word, and works even if a
// webhook is delayed or misconfigured. Idempotent via markPaid's status claim.
paymentsRouter.post(
  "/verify",
  validateBody(z.object({ orderId: z.string().cuid() })),
  async (req, res, next) => {
    try {
      const { orderId } = req.body as { orderId: string };
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId: req.userId! },
        include: { payment: true },
      });
      if (!order) throw new ApiError(404, "Order not found");

      // Nothing to verify in simulated mode, or when already settled.
      if (!cashfreeConfigured || order.status !== "pending_payment") {
        return res.json({ orderStatus: order.status });
      }

      const cf = await getCashfreeOrder(orderId);
      if (cf.order_status === "PAID") {
        const updated = await markPaid(orderId, "cashfree", {
          paidPaise: Math.round(cf.order_amount * 100),
          gatewayResponse: JSON.stringify({ verifiedViaReturn: true, ...cf }),
        });
        return res.json({ orderStatus: updated?.status ?? "pending_payment" });
      }
      res.json({ orderStatus: order.status, gatewayStatus: cf.order_status });
    } catch (err) {
      next(err);
    }
  },
);

paymentsRouter.get("/status/:orderId", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.userId! },
      include: { payment: { select: { status: true, method: true } } },
    });
    if (!order) throw new ApiError(404, "Order not found");
    res.json({
      orderStatus: order.status,
      payment: order.payment,
      amount: order.amount,
      title: order.title,
      domain: order.domain,
      provider: order.provider,
      savedPaise: order.savedPaise,
      // Bill breakdown for the payment "Order Summary" block.
      details: JSON.parse(order.details),
    });
  } catch (err) {
    next(err);
  }
});
