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
  verifyCashfreeWebhook,
} from "./cashfree.js";
import { sendPushToUser } from "../notifications/push.service.js";

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
  opts: { paidPaise?: number; gatewayResponse?: string } = {},
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

  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "confirmed" },
    }),
    prisma.payment.update({
      where: { orderId },
      data: { status: "success", method, gatewayResponse: opts.gatewayResponse },
    }),
    prisma.trackingEvent.createMany({
      data: (order.domain === "food" ? FOOD_EVENTS : RIDE_EVENTS).map((e, i) => ({
        orderId,
        status: e.status,
        message: e.message,
        // Future timestamps simulate live progress for the tracking screen.
        createdAt: new Date(Date.now() + i * 45_000),
      })),
    }),
  ]);

  // Fire-and-forget confirmation push (no-op if push isn't configured).
  void sendPushToUser(order.userId, {
    title: order.domain === "food" ? "Order confirmed 🍽️" : "Ride booked 🚕",
    body:
      order.domain === "food"
        ? `${order.title} is being prepared.`
        : `${order.title} — your driver is on the way.`,
    url: `/orders/${order.id}`,
  });

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
  validateBody(z.object({ orderId: z.string().cuid() })),
  async (req, res, next) => {
    try {
      const { orderId } = req.body as { orderId: string };
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

      if (cashfreeConfigured) {
        const cf = await createCashfreeOrder({
          orderId,
          amountPaise: order.amount,
          customerId: order.userId,
          customerEmail: order.user.email,
          customerPhone: order.user.phone ?? "",
          returnUrl: `${env.WEB_ORIGIN}/pay/${orderId}?from=cashfree`,
        });
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
