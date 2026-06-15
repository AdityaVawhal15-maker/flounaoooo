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

// ---------- Autonomous chat suggestions ----------
//
// The chat home shows three "smart chips". Instead of a fixed list, we build
// them from each user's own history — what they reorder, where they ride, and
// the time of day — so the screen feels personal. New users get sensible
// defaults. `icon` is a string key the web maps to an icon component (React
// components can't cross the JSON boundary).

type Suggestion = { label: string; prompt: string; icon: string; theme: string };

// Time-of-day food nudge — what most people are deciding right now.
function mealSuggestion(now = new Date()): Suggestion {
  const h = now.getHours();
  if (h < 11)
    return { label: "Breakfast picks", prompt: "Find me a quick breakfast under ₹150", icon: "coffee", theme: "amber" };
  if (h < 16)
    return { label: "Lunch under ₹200", prompt: "Best lunch near me under ₹200", icon: "utensils", theme: "orange" };
  if (h < 21)
    return { label: "Dinner ideas", prompt: "What's good for dinner tonight?", icon: "utensils", theme: "orange" };
  return { label: "Late-night bites", prompt: "Late-night food open now", icon: "moon", theme: "purple" };
}

// Pool of generic chips for filling empty slots (new users / sparse history).
const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: "Order pizza", prompt: "Order a pizza under ₹300", icon: "pizza", theme: "orange" },
  { label: "Book a ride", prompt: "Book a ride to ", icon: "mapPin", theme: "blue" },
  { label: "Shop a laptop", prompt: "Find me a gaming laptop under ₹70000", icon: "shoppingBag", theme: "purple" },
  { label: "Cheapest cab", prompt: "Find the cheapest cab right now", icon: "car", theme: "blue" },
  { label: "Veg thali", prompt: "Best veg thali near me", icon: "utensils", theme: "green" },
];

usersRouter.get("/suggestions", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.userId!,
        status: { in: ["confirmed", "in_progress", "completed"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { domain: true, details: true },
    });

    const out: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (s: Suggestion) => {
      if (out.length >= 3 || seen.has(s.label)) return;
      seen.add(s.label);
      out.push(s);
    };

    // 1) Reorder the dish they buy most (a real habit = ordered ≥ 2x).
    const dishCounts = new Map<string, { name: string; n: number }>();
    const dropCounts = new Map<string, number>();
    for (const o of orders) {
      try {
        const d = JSON.parse(o.details) as {
          dishId?: string;
          name?: string;
          drop?: string;
        };
        if (o.domain === "food" && d.dishId) {
          const cur = dishCounts.get(d.dishId);
          dishCounts.set(d.dishId, {
            name: d.name ?? cur?.name ?? "your usual",
            n: (cur?.n ?? 0) + 1,
          });
        }
        if (o.domain === "ride" && d.drop) {
          dropCounts.set(d.drop, (dropCounts.get(d.drop) ?? 0) + 1);
        }
      } catch {
        // ignore malformed snapshots
      }
    }

    const topDish = [...dishCounts.values()].sort((a, b) => b.n - a.n)[0];
    if (topDish && topDish.n >= 2) {
      add({
        label: `Reorder ${topDish.name}`,
        prompt: `Order ${topDish.name} again`,
        icon: "rotate",
        theme: "orange",
      });
    }

    // 2) Re-book a route they take often.
    const topDrop = [...dropCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topDrop && topDrop[1] >= 2) {
      add({
        label: `Ride to ${topDrop[0]}`,
        prompt: `Book a ride to ${topDrop[0]}`,
        icon: "mapPin",
        theme: "blue",
      });
    }

    // 3) Time-of-day meal nudge.
    add(mealSuggestion());

    // Fill any remaining slots with defaults (skipping duplicates by label).
    for (const s of DEFAULT_SUGGESTIONS) add(s);

    res.json({ suggestions: out.slice(0, 3) });
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
