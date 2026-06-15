import { prisma } from "../../lib/prisma.js";

// Monday 00:00 of the current week (local server time).
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type WeeklyBudget = {
  budgetPaise: number | null; // null = user hasn't set a budget
  spentPaise: number;
  remainingPaise: number | null;
};

// The Budget Guardian's weekly food picture for a user. Shared by the
// /budget endpoint and the budget-aware chat recommendations.
export async function weeklyFoodBudget(userId: string): Promise<WeeklyBudget> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyFoodBudgetPaise: true },
  });
  const spent = await prisma.order.aggregate({
    where: {
      userId,
      domain: "food",
      status: { in: ["confirmed", "in_progress", "completed"] },
      createdAt: { gte: startOfWeek() },
    },
    _sum: { amount: true },
  });
  const spentPaise = spent._sum.amount ?? 0;
  const budgetPaise = user?.weeklyFoodBudgetPaise ?? null;
  return {
    budgetPaise,
    spentPaise,
    remainingPaise: budgetPaise === null ? null : budgetPaise - spentPaise,
  };
}
