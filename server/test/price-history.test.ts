import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  predictFromHistory,
  recordObservation,
} from "../src/modules/advisor/priceHistory.service.js";

// Seed observations directly so we control the learned pattern.
async function seed(
  domain: "food" | "ride",
  key: string,
  hour: number,
  prices: number[],
) {
  await prisma.priceObservation.createMany({
    data: prices.map((bestPaise) => ({
      domain,
      key,
      hour,
      weekday: 0,
      bestPaise,
    })),
  });
}

function at(hour: number): Date {
  const d = new Date("2026-06-15T00:00:00");
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe("price-history advisor", () => {
  it("returns null until enough data exists (cold start)", async () => {
    const result = await predictFromHistory("food", "cold-dish", at(12));
    expect(result).toBeNull();
  });

  it("suggests waiting when a cheaper hour is coming up", async () => {
    const key = "history-dish-1";
    await seed("food", key, 19, [30000, 30200, 29800]); // now: ~₹300
    await seed("food", key, 20, [20000, 20100, 19900]); // +1h: ~₹200

    const result = await predictFromHistory("food", key, at(19));
    expect(result).not.toBeNull();
    expect(result!.action).toBe("wait");
    expect(result!.source).toBe("history");
    expect(result!.expectedSavingPaise).toBeGreaterThan(9000);
  });

  it("says order now when the current hour is already cheapest", async () => {
    const key = "history-dish-2";
    await seed("food", key, 13, [15000, 15100, 14900]); // now: cheapest
    await seed("food", key, 14, [18000, 18200, 17800]); // +1h: pricier

    const result = await predictFromHistory("food", key, at(13));
    expect(result).not.toBeNull();
    expect(result!.action).toBe("order_now");
  });

  it("ignores trivial differences under ₹10", async () => {
    const key = "history-dish-3";
    await seed("food", key, 10, [20000, 20000, 20000]);
    await seed("food", key, 11, [19950, 19950, 19950]); // only ₹0.50 cheaper

    const result = await predictFromHistory("food", key, at(10));
    expect(result!.action).toBe("order_now");
  });

  it("recordObservation persists a row", async () => {
    recordObservation("ride", "test-vehicle", 12345, at(8));
    // fire-and-forget — give it a tick to flush
    await new Promise((r) => setTimeout(r, 100));
    const count = await prisma.priceObservation.count({
      where: { key: "test-vehicle" },
    });
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
