import { prisma } from "../../lib/prisma.js";

// Decision Intelligence — Faculty 1: Memory.
//
// Derives a compact, living profile of a user from their OWN order history:
// taste, spend behaviour, and routines. This is the foundation personalization
// builds on — two users asking "order biryani" should get different best picks.
// Read-only and deterministic; no catalogue or fulfilment dependency. Nothing
// is surveilled — it is computed from the user's transactions and is resettable.

export type DecisionProfile = {
  // Confidence rises with order count; below ~3 paid orders we treat the user
  // as "new" and lean on sensible defaults rather than thin personalization.
  orders: number;
  confident: boolean;

  taste: {
    topDishes: { name: string; count: number }[]; // most-ordered dishes
    dietary: "veg" | "nonveg" | "mixed" | "unknown"; // observed pattern
  };

  spend: {
    avgOrderPaise: number; // typical food order value
    band: "budget" | "mid" | "premium" | "unknown"; // spend tier
    offerSensitive: boolean; // tends to pick discounted options
  };

  routines: {
    // Recurring ride destinations with the typical hour they're booked.
    recurringRides: { drop: string; count: number; typicalHour: number | null }[];
    // Dishes reordered enough to count as a habit.
    reorderHabits: { name: string; count: number }[];
  };
};

const PAID = ["confirmed", "in_progress", "completed"] as const;

// Spend bands in paise (food order value).
const MID_FLOOR = 15000; // ₹150
const PREMIUM_FLOOR = 30000; // ₹300

function spendBand(avgPaise: number): DecisionProfile["spend"]["band"] {
  if (avgPaise <= 0) return "unknown";
  if (avgPaise < MID_FLOOR) return "budget";
  if (avgPaise < PREMIUM_FLOOR) return "mid";
  return "premium";
}

export async function buildDecisionProfile(
  userId: string,
): Promise<DecisionProfile> {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: [...PAID] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { domain: true, amount: true, details: true, createdAt: true },
  });

  const dishCounts = new Map<string, number>();
  const dropTimes = new Map<string, number[]>(); // drop -> hours booked
  let vegCount = 0;
  let nonvegCount = 0;
  let offerCount = 0;
  const foodAmounts: number[] = [];

  for (const o of orders) {
    let d: {
      name?: string;
      dietary?: string;
      drop?: string;
      offers?: { discountPaise: number }[];
    };
    try {
      d = JSON.parse(o.details);
    } catch {
      continue;
    }

    if (o.domain === "food") {
      foodAmounts.push(o.amount);
      if (d.name) dishCounts.set(d.name, (dishCounts.get(d.name) ?? 0) + 1);
      if (d.dietary === "veg") vegCount++;
      else if (d.dietary === "nonveg") nonvegCount++;
      if ((d.offers?.reduce((s, x) => s + x.discountPaise, 0) ?? 0) > 0) offerCount++;
    } else if (o.domain === "ride" && d.drop) {
      const hour = new Date(o.createdAt).getHours();
      const arr = dropTimes.get(d.drop) ?? [];
      arr.push(hour);
      dropTimes.set(d.drop, arr);
    }
  }

  const foodOrders = foodAmounts.length;
  const avgOrderPaise =
    foodOrders > 0 ? Math.round(foodAmounts.reduce((a, b) => a + b, 0) / foodOrders) : 0;

  const dietary: DecisionProfile["taste"]["dietary"] =
    vegCount + nonvegCount === 0
      ? "unknown"
      : vegCount > 0 && nonvegCount > 0
        ? "mixed"
        : vegCount > 0
          ? "veg"
          : "nonveg";

  const topDishes = [...dishCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recurringRides = [...dropTimes.entries()]
    .map(([drop, hours]) => ({
      drop,
      count: hours.length,
      typicalHour: hours.length > 0 ? modeHour(hours) : null,
    }))
    .filter((r) => r.count >= 2) // a habit needs ≥2 trips
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const reorderHabits = topDishes.filter((d) => d.count >= 2);

  return {
    orders: orders.length,
    confident: orders.length >= 3,
    taste: { topDishes, dietary },
    spend: {
      avgOrderPaise,
      band: spendBand(avgOrderPaise),
      offerSensitive: foodOrders > 0 && offerCount / foodOrders >= 0.5,
    },
    routines: { recurringRides, reorderHabits },
  };
}

// Most common hour in a list (the user's typical booking time for a route).
function modeHour(hours: number[]): number {
  const counts = new Map<number, number>();
  for (const h of hours) counts.set(h, (counts.get(h) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}
