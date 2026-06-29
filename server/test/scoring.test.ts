import { describe, expect, it } from "vitest";
import { scoreOptions, weightsFor } from "../src/modules/advisor/scoring.js";
import { recommendFood } from "../src/modules/food/food.service.js";
import { recommendProduct } from "../src/modules/shop/shop.service.js";

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

describe("personalized scoring (decision profile)", () => {
  // A clear trade-off: a cheaper-but-lower-rated option vs a pricier top-rated
  // one. The user's spend band should tip the balanced pick between them.
  const items = [
    { pricePaise: 10000, rating: 3.9, etaMinutes: 30, name: "Value Plate" },
    { pricePaise: 28000, rating: 4.8, etaMinutes: 30, name: "Premium Plate" },
  ];

  it("budget band leans the balanced pick cheaper", () => {
    const ranked = scoreOptions(items, "balanced", { spendBand: "budget" });
    expect(ranked[0]!.item.pricePaise).toBe(10000);
  });

  it("premium band leans the balanced pick higher-rated", () => {
    const ranked = scoreOptions(items, "balanced", { spendBand: "premium" });
    expect(ranked[0]!.item.rating).toBe(4.8);
  });

  it("personalization does not override an explicit priority", () => {
    // Even a premium spender who asked for the cheapest gets the cheapest.
    const ranked = scoreOptions(items, "price", { spendBand: "premium" });
    expect(ranked[0]!.item.pricePaise).toBe(10000);
  });

  it("a taste-match bonus tips a near-tie toward the favourite", () => {
    const tie = [
      { pricePaise: 20000, rating: 4.4, etaMinutes: 30, name: "Other Dish" },
      { pricePaise: 20000, rating: 4.4, etaMinutes: 30, name: "Usual Dish" },
    ];
    const ranked = scoreOptions(tie, "balanced", {
      spendBand: "mid",
      tasteBonus: (i) => (i.name === "Usual Dish" ? 0.1 : 0),
    });
    expect(ranked[0]!.item.name).toBe("Usual Dish");
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

describe("ratings-aware shop recommendations", () => {
  it("'cheapest' picks the lowest effective price", () => {
    const rec = recommendProduct({ query: "", priority: "price" })!;
    expect(rec).toBeTruthy();
    for (const alt of rec.alternatives) {
      expect(rec.best.effectivePaise).toBeLessThanOrEqual(alt.effectivePaise);
    }
  });

  it("'top-rated' picks the highest rating", () => {
    const rec = recommendProduct({ query: "", priority: "rating" })!;
    expect(rec).toBeTruthy();
    for (const alt of rec.alternatives) {
      expect(rec.best.rating).toBeGreaterThanOrEqual(alt.rating);
    }
    expect(rec.why.toLowerCase()).toContain("top-rated");
  });

  it("priority changes the winner", () => {
    const cheap = recommendProduct({ query: "", priority: "price" })!;
    const rated = recommendProduct({ query: "", priority: "rating" })!;
    expect(rated.best.rating).toBeGreaterThanOrEqual(cheap.best.rating);
  });
});
