import { prisma } from "../../lib/prisma.js";
import { istStartOfWeek } from "../../lib/istTime.js";

// Monday 00:00 in India, which is the week the person spending the money is
// living in. This used to be the server's own Monday: correct on a laptop in
// India, five and a half hours early on a UTC host, where a Monday-morning
// order would have been counted against last week's budget.
export function startOfWeek(now = new Date()): Date {
  return istStartOfWeek(now);
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
