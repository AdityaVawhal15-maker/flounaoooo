import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import {
  walletBalance,
  creditCashback,
  spendFromWallet,
  refundToWallet,
} from "../src/modules/users/wallet.service.js";

// Rewards wallet. The balance is a sum of the ledger, so these tests care most
// about the two ways a ledger goes wrong: paying the same reward twice, and
// spending the same rupees twice.

async function userId(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return u.id;
}

describe("rewards wallet", () => {
  it("starts empty and reports an empty history", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/wallet").expect(200);
    expect(res.body.balancePaise).toBe(0);
    expect(res.body.entries).toEqual([]);
  });

  it("credits the configured share of the margin, once per order", async () => {
    const { agent, email } = await authedAgent();
    const id = await userId(email);

    // 30% of a 1000 paise margin = 300 paise, using the shipped default.
    await creditCashback({ userId: id, orderId: "order-1", marginPaise: 1000 });
    expect(await walletBalance(id)).toBe(300);

    // A second call for the same order is a no-op, not a second payout.
    await creditCashback({ userId: id, orderId: "order-1", marginPaise: 1000 });
    expect(await walletBalance(id)).toBe(300);

    const res = await agent.get("/api/users/wallet").expect(200);
    expect(res.body.balancePaise).toBe(300);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].reason).toBe("cashback");
  });

  it("pays nothing when there is no margin to share", async () => {
    const { email } = await authedAgent();
    const id = await userId(email);
    await creditCashback({ userId: id, orderId: "o", marginPaise: 0 });
    await creditCashback({ userId: id, orderId: "o2", marginPaise: -500 });
    expect(await walletBalance(id)).toBe(0);
  });

  it("spends only what is there and never goes negative", async () => {
    const { email } = await authedAgent();
    const id = await userId(email);
    await creditCashback({ userId: id, orderId: "earn", marginPaise: 1000 }); // 300

    // Asking for more than the balance takes the balance, not more.
    const took = await spendFromWallet({ userId: id, orderId: "spend-1", maxPaise: 5000 });
    expect(took).toBe(300);
    expect(await walletBalance(id)).toBe(0);

    // Nothing left to take.
    const again = await spendFromWallet({ userId: id, orderId: "spend-2", maxPaise: 100 });
    expect(again).toBe(0);
    expect(await walletBalance(id)).toBe(0);
  });

  it("two concurrent spends cannot both take the same balance", async () => {
    const { email } = await authedAgent();
    const id = await userId(email);
    await creditCashback({ userId: id, orderId: "earn", marginPaise: 1000 }); // 300

    const [a, b] = await Promise.all([
      spendFromWallet({ userId: id, orderId: "race-a", maxPaise: 300 }).catch(() => 0),
      spendFromWallet({ userId: id, orderId: "race-b", maxPaise: 300 }).catch(() => 0),
    ]);
    // Whatever the interleaving, the two spends together cannot exceed 300 and
    // the balance cannot end up below zero.
    expect(a + b).toBeLessThanOrEqual(300);
    expect(await walletBalance(id)).toBeGreaterThanOrEqual(0);
  });

  it("credits a refund and refuses to credit the same one twice", async () => {
    const { email } = await authedAgent();
    const id = await userId(email);
    await refundToWallet({ userId: id, orderId: "ord", amountPaise: 25000 });
    expect(await walletBalance(id)).toBe(25000);
    await expect(
      refundToWallet({ userId: id, orderId: "ord", amountPaise: 25000 }),
    ).rejects.toThrow();
    expect(await walletBalance(id)).toBe(25000);
  });

  it("one account's balance is invisible to another", async () => {
    const a = await authedAgent();
    const b = await authedAgent();
    await creditCashback({ userId: await userId(a.email), orderId: "x", marginPaise: 10000 });
    expect((await b.agent.get("/api/users/wallet").expect(200)).body.balancePaise).toBe(0);
  });

  it("requires a session", async () => {
    await request(app).get("/api/users/wallet").expect(401);
  });
});
