import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { searchFood } from "../food/food.service.js";
import { quoteRides, estimateTrip } from "../rides/rides.service.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

const createFoodOrder = z.object({
  domain: z.literal("food"),
  dishId: z.string().max(60),
  platform: z.enum(["ondc", "swiggy", "zomato"]),
});

// The client sends pickup/drop COORDINATES, not a distance. The server
// recomputes distance+time itself so the fare can't be gamed by faking a
// short trip. Labels (pickup/drop strings) are display-only.
const createRideOrder = z.object({
  domain: z.literal("ride"),
  provider: z.enum(["uber", "ola", "rapido", "ondc"]),
  productName: z.string().max(60),
  pickup: z.string().max(160),
  drop: z.string().max(160),
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  dropLat: z.number().min(-90).max(90),
  dropLng: z.number().min(-180).max(180),
});

// Prices are always recomputed server-side from the catalog/quote engine —
// a tampered client cannot set its own amount.
ordersRouter.post(
  "/",
  validateBody(z.discriminatedUnion("domain", [createFoodOrder, createRideOrder])),
  async (req, res, next) => {
    try {
      const body = req.body as
        | z.infer<typeof createFoodOrder>
        | z.infer<typeof createRideOrder>;

      if (body.domain === "food") {
        const allQuotes = searchFood({ query: "" }).filter(
          (q) => q.dishId === body.dishId,
        );
        const quote = allQuotes.find((q) => q.platform === body.platform);
        if (!quote) throw new ApiError(404, "That option is no longer available");

        // Savings vs the cheapest alternative platform for the same dish —
        // the number behind "you always got the best price".
        const cheapestOther = Math.min(
          ...allQuotes
            .filter((q) => q.platform !== body.platform)
            .map((q) => q.effectivePaise),
        );
        const savedPaise = Number.isFinite(cheapestOther)
          ? Math.max(0, cheapestOther - quote.effectivePaise)
          : 0;

        const defaultAddress = await prisma.address.findFirst({
          where: { userId: req.userId!, isDefault: true },
        });

        const order = await prisma.order.create({
          data: {
            userId: req.userId!,
            domain: "food",
            status: "pending_payment",
            provider: quote.platform,
            fulfillment: quote.fulfillment,
            title: `${quote.name} — ${quote.restaurant}`,
            details: JSON.stringify({
              ...quote,
              // decision-receipt stats, frozen at decision time
              comparedOptions: allQuotes.length,
              comparedPlatforms: new Set(allQuotes.map((q) => q.platform)).size,
            }),
            amount: quote.effectivePaise,
            savedPaise,
            addressId: defaultAddress?.id ?? null,
          },
        });
        return res.status(201).json({ order });
      }

      // Recompute the trip from coordinates — never trust a client distance.
      const { distanceKm, rideMinutes } = estimateTrip(
        body.pickupLat,
        body.pickupLng,
        body.dropLat,
        body.dropLng,
      );
      const quotes = quoteRides({ distanceKm, rideMinutes });
      const quote = quotes.find(
        (q) => q.provider === body.provider && q.productName === body.productName,
      );
      if (!quote) throw new ApiError(404, "That ride option is no longer available");

      // Savings vs the cheapest other option of the same vehicle type.
      const cheapestOther = Math.min(
        ...quotes
          .filter((q) => q.vehicle === quote.vehicle && q !== quote)
          .map((q) => q.effectivePaise),
      );
      const savedPaise = Number.isFinite(cheapestOther)
        ? Math.max(0, cheapestOther - quote.effectivePaise)
        : 0;

      const order = await prisma.order.create({
        data: {
          userId: req.userId!,
          domain: "ride",
          status: "pending_payment",
          provider: quote.provider,
          fulfillment: quote.fulfillment,
          title: `${quote.productName}: ${body.pickup} → ${body.drop}`,
          details: JSON.stringify({
            ...quote,
            pickup: body.pickup,
            drop: body.drop,
            comparedOptions: quotes.length,
            comparedPlatforms: new Set(quotes.map((q) => q.provider)).size,
          }),
          amount: quote.effectivePaise,
          savedPaise,
        },
      });
      res.status(201).json({ order });
    } catch (err) {
      next(err);
    }
  },
);

ordersRouter.get("/", async (req, res, next) => {
  try {
    const domain = req.query.domain;
    const orders = await prisma.order.findMany({
      where: {
        userId: req.userId!,
        ...(domain === "food" || domain === "ride" ? { domain } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        domain: true,
        status: true,
        provider: true,
        title: true,
        amount: true,
        createdAt: true,
      },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    let order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        trackingEvents: { orderBy: { createdAt: "asc" } },
        payment: {
          select: { status: true, method: true, gatewayOrderId: true },
        },
      },
    });
    if (!order) throw new ApiError(404, "Order not found");

    // Lazy lifecycle completion: once every tracking step has elapsed,
    // a confirmed order becomes completed (real ONDC webhooks replace this).
    if (
      order.status === "confirmed" &&
      order.trackingEvents.length > 0 &&
      order.trackingEvents.every((e) => e.createdAt <= new Date())
    ) {
      order = {
        ...order,
        ...(await prisma.order.update({
          where: { id: order.id },
          data: { status: "completed" },
        })),
      };
    }

    res.json({
      order: { ...order, details: JSON.parse(order.details) },
    });
  } catch (err) {
    next(err);
  }
});
