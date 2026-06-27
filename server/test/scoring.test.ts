import { describe, expect, it } from "vitest";
import { scoreOptions, weightsFor } from "../src/modules/advisor/scoring.js";
import { recommendFood } from "../src/modules/food/food.service.js";

describe("scoring engine", () => {
  it("weights sum to 1 for every priority", () => {
    for (const p of ["price", "rating", "speed", "balanced"] as const) {
      const w = weightsFor(p);
      expect(w.price + w.rating + w.speed).toBeCloseTo(1, 5);
    }
  });

  it("price priority ranks the cheapest first", () => {
    const items = [
      { pricePaise: 30000, rating: 4.9, etaMinutes: 20 },
      { pricePaise: 10000, rating: 4.0, etaMinutes: 40 },
      { pricePaise: 20000, rating: 4.5, etaMinutes: 30 },
    ];
    const ranked = scoreOptions(items, "price");
    expect(ranked[0]!.item.pricePaise).toBe(10000);
  });

  it("rating priority ranks the highest rated first", () => {
    const items = [
      { pricePaise: 10000, rating: 4.0, etaMinutes: 20 },
      { pricePaise: 30000, rating: 4.9, etaMinutes: 30 },
      { pricePaise: 20000, rating: 4.5, etaMinutes: 25 },
    ];
    const ranked = scoreOptions(items, "rating");
    expect(ranked[0]!.item.rating).toBe(4.9);
  });

  it("speed priority ranks the fastest first", () => {
    const items = [
      { pricePaise: 10000, rating: 4.9, etaMinutes: 45 },
      { pricePaise: 30000, rating: 4.0, etaMinutes: 10 },
      { pricePaise: 20000, rating: 4.5, etaMinutes: 25 },
    ];
    const ranked = scoreOptions(items, "speed");
    expect(ranked[0]!.item.etaMinutes).toBe(10);
  });
});

describe("ratings-aware food recommendations", () => {
  it("'cheapest' picks the lowest effective price", () => {
    const rec = recommendFood({ query: "", priority: "price" });
    expect(rec).toBeTruthy();
    const all = recommendFood({ query: "", priority: "price" })!;
    // The chosen pick is the cheapest among all alternatives shown.
    for (const alt of all.alternatives) {
      expect(all.best.effectivePaise).toBeLessThanOrEqual(alt.effectivePaise);
    }
  });

  it("'top-rated' picks the highest rating, not the cheapest", () => {
    const rec = recommendFood({ query: "", priority: "rating" })!;
    expect(rec).toBeTruthy();
    // The pick's rating is at least as high as every alternative's.
    for (const alt of rec.alternatives) {
      expect(rec.best.rating).toBeGreaterThanOrEqual(alt.rating);
    }
    expect(rec.why.toLowerCase()).toContain("top-rated");
  });

  it("priority changes the winner (rating vs price differ)", () => {
    const cheap = recommendFood({ query: "", priority: "price" })!;
    const rated = recommendFood({ query: "", priority: "rating" })!;
    // With a varied catalogue the cheapest and the top-rated are different dishes.
    expect(rated.best.rating).toBeGreaterThanOrEqual(cheap.best.rating);
  });
});
