import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { searchFood } from "../food/food.service.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.patch(
  "/me",
  validateBody(
    z.object({
      name: z.string().trim().min(2).max(80).optional(),
      phone: z
        .string()
        .trim()
        .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
        .nullable()
        .optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const data = req.body as { name?: string; phone?: string | null };
      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          // Changing the number resets verification until SMS OTP ships.
          ...(data.phone !== undefined
            ? { phone: data.phone, phoneVerified: false }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          avatarUrl: true,
        },
      });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- Budget Guardian ----------

function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

usersRouter.get("/budget", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { weeklyFoodBudgetPaise: true },
    });
    const spent = await prisma.order.aggregate({
      where: {
        userId: req.userId!,
        domain: "food",
        status: { in: ["confirmed", "in_progress", "completed"] },
        createdAt: { gte: startOfWeek() },
      },
      _sum: { amount: true },
    });
    const spentPaise = spent._sum.amount ?? 0;
    const budgetPaise = user?.weeklyFoodBudgetPaise ?? null;
    res.json({
      budgetPaise,
      spentPaise,
      remainingPaise: budgetPaise === null ? null : budgetPaise - spentPaise,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.put(
  "/budget",
  validateBody(
    z.object({
      // rupees from the client; null clears the budget
      weeklyBudgetRupees: z.number().int().min(100).max(100000).nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { weeklyBudgetRupees } = req.body as { weeklyBudgetRupees: number | null };
      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          weeklyFoodBudgetPaise:
            weeklyBudgetRupees === null ? null : weeklyBudgetRupees * 100,
        },
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// Lifetime savings — sum across paid orders. Powers the rewards screen.
usersRouter.get("/savings", async (req, res, next) => {
  try {
    const result = await prisma.order.aggregate({
      where: {
        userId: req.userId!,
        status: { in: ["confirmed", "in_progress", "completed"] },
      },
      _sum: { savedPaise: true },
      _count: { id: true },
    });
    res.json({
      totalSavedPaise: result._sum.savedPaise ?? 0,
      paidOrders: result._count.id,
    });
  } catch (err) {
    next(err);
  }
});

// "The usual": the dish this user pays for most often, with today's best
// price — powers one-tap reorder.
usersRouter.get("/usual", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.userId!,
        domain: "food",
        status: { in: ["confirmed", "in_progress", "completed"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { details: true },
    });
    if (orders.length === 0) return res.json({ usual: null });

    const counts = new Map<string, number>();
    for (const o of orders) {
      try {
        const dishId = (JSON.parse(o.details) as { dishId?: string }).dishId;
        if (dishId) counts.set(dishId, (counts.get(dishId) ?? 0) + 1);
      } catch {
        // ignore malformed snapshots
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    // One-off orders aren't a habit yet.
    if (!top || top[1] < 2) return res.json({ usual: null });

    const [dishId, timesOrdered] = top;
    const bestNow = searchFood({ query: "" }).find((q) => q.dishId === dishId);
    if (!bestNow) return res.json({ usual: null });

    res.json({ usual: { ...bestNow, timesOrdered } });
  } catch (err) {
    next(err);
  }
});

// ---------- addresses ----------

const addressBody = z.object({
  label: z.string().trim().min(1).max(30),
  line1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  isDefault: z.boolean().default(false),
});

usersRouter.get("/addresses", async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.userId! },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/addresses", validateBody(addressBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof addressBody>;
    if (body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.create({
      data: { ...body, userId: req.userId! },
    });
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
});

usersRouter.delete("/addresses/:id", async (req, res, next) => {
  try {
    const deleted = await prisma.address.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (deleted.count === 0) throw new ApiError(404, "Address not found");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
