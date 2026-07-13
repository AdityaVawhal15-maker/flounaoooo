import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { quotesForDish } from "../food/food.service.js";

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

const MAX_ALERTS_PER_USER = 30;

const createBody = z.object({
  domain: z.literal("food"), // rides alerts can be added once distance UX exists
  itemKey: z.string().max(60), // dishId
  targetRupees: z.number().int().min(10).max(100000),
});

alertsRouter.post("/", validateBody(createBody), async (req, res, next) => {
  try {
    const { itemKey, targetRupees } = req.body as z.infer<typeof createBody>;

    // Look up the dish server-side — name and current price are trusted, never
    // taken from the client. Direct id lookup so it works for every dish
    // including desserts, independent of the text-search tuning.
    const quote = quotesForDish(itemKey)[0];
    if (!quote) throw new ApiError(404, "That item is no longer available");

    const activeCount = await prisma.priceAlert.count({
      where: { userId: req.userId!, active: true },
    });
    if (activeCount >= MAX_ALERTS_PER_USER) {
      throw new ApiError(429, "You have too many active alerts. Remove some first.");
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: req.userId!,
        domain: "food",
        itemKey,
        itemName: quote.name,
        targetPaise: targetRupees * 100,
        lastSeenPaise: quote.effectivePaise,
      },
    });
    res.status(201).json({ alert });
  } catch (err) {
    next(err);
  }
});

alertsRouter.get("/", async (req, res, next) => {
  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: req.userId! },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

alertsRouter.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await prisma.priceAlert.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (deleted.count === 0) throw new ApiError(404, "Alert not found");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
