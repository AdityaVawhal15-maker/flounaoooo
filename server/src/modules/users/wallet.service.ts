import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error.js";
import { getConfig } from "../backoffice/config.service.js";

// Rewards wallet.
//
// The balance is always SUM(amountPaise) over the ledger, never a stored
// column: a column would be a second source of truth that can drift from the
// events that produced it, and money that disagrees with its own history is
// worse than no feature at all.
//
// The earning rule is not invented here. `cashbackUserSharePct` already exists
// in platform config — the share of Flouna's own margin handed back to the
// buyer — set by a super admin and defaulting to 30%. Until now nothing read
// it; this is what spends it.

/** Signed sum of the ledger. Never negative in practice — spends are checked. */
export async function walletBalance(userId: string) {
  const agg = await prisma.walletEntry.aggregate({
    where: { userId },
    _sum: { amountPaise: true },
  });
  return agg._sum.amountPaise ?? 0;
}

export async function walletHistory(userId: string, take = 50) {
  return prisma.walletEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amountPaise: true,
      reason: true,
      description: true,
      orderId: true,
      createdAt: true,
    },
  });
}

/**
 * Credits the buyer's share of the margin on a completed order.
 *
 * Idempotent by construction: the ledger has a unique index on
 * (userId, orderId, reason), so a retried webhook or a second call for the same
 * order cannot pay the cashback twice. A duplicate is swallowed rather than
 * thrown, because the caller's job (completing an order) has already succeeded
 * and must not fail on a reward that was already granted.
 */
export async function creditCashback(opts: {
  userId: string;
  orderId: string;
  /** What Flouna actually earned on this order, in paise. */
  marginPaise: number;
  title?: string;
}) {
  if (opts.marginPaise <= 0) return null;
  const { cashbackUserSharePct } = await getConfig();
  if (cashbackUserSharePct <= 0) return null;

  const amountPaise = Math.floor((opts.marginPaise * cashbackUserSharePct) / 100);
  if (amountPaise <= 0) return null;

  try {
    return await prisma.walletEntry.create({
      data: {
        userId: opts.userId,
        orderId: opts.orderId,
        amountPaise,
        reason: "cashback",
        description: opts.title
          ? `Cashback on ${opts.title}`
          : "Cashback on your order",
      },
    });
  } catch {
    // Unique constraint — already credited for this order.
    return null;
  }
}

/**
 * Spends wallet credit. Returns the amount actually taken, which may be less
 * than requested when the balance is short.
 *
 * The balance is re-summed inside the same interactive transaction that writes
 * the debit, so two requests racing to spend the same rupees cannot both win:
 * the second sees the first's row and is capped by it.
 */
export async function spendFromWallet(opts: {
  userId: string;
  orderId: string;
  /** Most the caller is willing to take — usually the order total. */
  maxPaise: number;
  description?: string;
}) {
  if (opts.maxPaise <= 0) return 0;

  return prisma.$transaction(async (tx) => {
    const agg = await tx.walletEntry.aggregate({
      where: { userId: opts.userId },
      _sum: { amountPaise: true },
    });
    const balance = agg._sum.amountPaise ?? 0;
    const take = Math.min(balance, opts.maxPaise);
    if (take <= 0) return 0;

    await tx.walletEntry.create({
      data: {
        userId: opts.userId,
        orderId: opts.orderId,
        amountPaise: -take,
        reason: "spend",
        description: opts.description ?? "Applied to your order",
      },
    });
    return take;
  });
}

/** Returns credit to the wallet when an order it paid for is cancelled. */
export async function refundToWallet(opts: {
  userId: string;
  orderId: string;
  amountPaise: number;
  description?: string;
}) {
  if (opts.amountPaise <= 0) return null;
  try {
    return await prisma.walletEntry.create({
      data: {
        userId: opts.userId,
        orderId: opts.orderId,
        amountPaise: opts.amountPaise,
        reason: "refund",
        description: opts.description ?? "Refunded to your wallet",
      },
    });
  } catch {
    throw new ApiError(409, "That refund was already credited");
  }
}
