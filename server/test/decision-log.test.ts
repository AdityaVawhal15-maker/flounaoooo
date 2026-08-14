import { describe, expect, it } from "vitest";
import { recommendFood, searchFoodTraced } from "../src/modules/food/food.service.js";
import { quoteRidesTraced } from "../src/modules/rides/rides.service.js";
import { appliedWeights } from "../src/modules/advisor/scoring.js";

// The decision log exists to answer "why was I shown this?" after the fact —
// ONDC's buyer-app disclosure asks a buyer app to account for its ranking, and
// before this the answer could not be reconstructed. These tests guard the
// property that makes the log trustworthy: the recorded explanation must match
// what the engine actually did, not a re-derived guess at it.

describe("decision trace — food", () => {
  it("records the weights the scorer actually used", () => {
    for (const priority of ["balanced", "price", "rating", "speed"] as const) {
      const rec = recommendFood({ query: "biryani", priority });
      expect(rec).toBeTruthy();
      expect(rec!.trace.weights).toEqual(appliedWeights(priority));
      expect(rec!.trace.priority).toBe(priority);
    }
  });

  it("weights always sum to 1, so scores stay comparable across searches", () => {
    const rec = recommendFood({ query: "biryani", priority: "price" });
    const w = rec!.trace.weights;
    expect(w.price + w.rating + w.speed).toBeCloseTo(1, 10);
  });

  it("scores every candidate, best first, and names the chosen one", () => {
    const rec = recommendFood({ query: "biryani", priority: "balanced" });
    const t = rec!.trace;

    expect(t.scores).toHaveLength(t.candidateCount);
    const descending = [...t.scores].sort((a, b) => b.score - a.score);
    expect(t.scores.map((s) => s.score)).toEqual(descending.map((s) => s.score));
    expect(t.chosenKey).toBe(t.scores[0]!.key);
  });

  it("the chosen key identifies the pick that was returned", () => {
    const rec = recommendFood({ query: "biryani", priority: "balanced" });
    expect(rec!.trace.chosenKey).toBe(`${rec!.best.dishId}@${rec!.best.platform}`);
  });

  it("explains the winner: the top score belongs to the returned pick", () => {
    const rec = recommendFood({ query: "biryani", priority: "price" });
    const top = rec!.trace.scores[0]!;
    expect(top.pricePaise).toBe(rec!.best.effectivePaise);
    // Under a price priority the winner must be the cheapest scored option.
    const cheapest = Math.min(...rec!.trace.scores.map((s) => s.pricePaise));
    expect(top.pricePaise).toBe(cheapest);
  });

  it("records a dietary filter as an exclusion with a count", () => {
    const { exclusions } = searchFoodTraced({ query: "food", dietary: "veg" });
    const dietary = exclusions.find((e) => e.rule === "dietary_filter");
    expect(dietary).toBeTruthy();
    expect(dietary!.count).toBeGreaterThan(0);
  });

  it("distinguishes a budget that filtered from a budget that was waived", () => {
    // Generous budget: some options priced out, the rest shown.
    const filtered = searchFoodTraced({ query: "biryani", budgetPaise: 25_000 });
    expect(filtered.exclusions.some((e) => e.rule === "budget_ceiling")).toBe(true);
    expect(filtered.quotes.every((q) => q.effectivePaise <= 25_000)).toBe(true);

    // Impossible budget: the rule is non-binding, so results are shown anyway
    // and the log must say the ceiling was waived rather than claim a filter.
    const waived = searchFoodTraced({ query: "biryani", budgetPaise: 1 });
    expect(waived.quotes.length).toBeGreaterThan(0);
    expect(waived.exclusions.some((e) => e.rule === "budget_ceiling_waived")).toBe(true);
    expect(waived.exclusions.some((e) => e.rule === "budget_ceiling")).toBe(false);
  });

  it("excludedCount is the sum of the individual exclusion counts", () => {
    const rec = recommendFood({ query: "biryani", dietary: "nonveg" });
    const t = rec!.trace;
    expect(t.excludedCount).toBe(t.exclusions.reduce((s, e) => s + e.count, 0));
  });

  it("marks personalisation only when a profile was actually applied", () => {
    const plain = recommendFood({ query: "biryani", priority: "balanced" });
    expect(plain!.trace.personalized).toBe(false);

    const personalized = recommendFood({
      query: "biryani",
      priority: "balanced",
      personal: { spendBand: "budget" },
    });
    expect(personalized!.trace.personalized).toBe(true);
    // A budget profile must actually shift weight onto price.
    expect(personalized!.trace.weights.price).toBeGreaterThan(plain!.trace.weights.price);
  });

  it("an explicit priority overrides a profile, and the trace says so", () => {
    const rec = recommendFood({
      query: "biryani",
      priority: "speed",
      personal: { spendBand: "budget" },
    });
    expect(rec!.trace.personalized).toBe(false);
    expect(rec!.trace.weights).toEqual(appliedWeights("speed"));
  });
});

describe("decision trace — rides", () => {
  it("traces a ride ranking with scores and a chosen product", () => {
    const { quotes, trace } = quoteRidesTraced({ distanceKm: 8, rideMinutes: 20 });
    expect(trace).toBeTruthy();
    expect(trace!.candidateCount).toBe(quotes.length);
    expect(trace!.chosenKey).toBe(quotes[0]!.productName);
    expect(trace!.personalized).toBe(false);
  });

  it("records the vehicle filter as an exclusion", () => {
    const { trace } = quoteRidesTraced({ distanceKm: 8, rideMinutes: 20, vehicle: "cab" });
    const vehicle = trace!.exclusions.find((e) => e.rule === "vehicle_type");
    expect(vehicle).toBeTruthy();
    expect(vehicle!.count).toBeGreaterThan(0);
  });

  it("an unfiltered ride search excludes nothing", () => {
    const { trace } = quoteRidesTraced({ distanceKm: 8, rideMinutes: 20, vehicle: "any" });
    expect(trace!.excludedCount).toBe(0);
    expect(trace!.exclusions).toEqual([]);
  });
});

describe("tracing does not change behaviour", () => {
  it("searchFoodTraced returns exactly what searchFood returns", async () => {
    const { searchFood } = await import("../src/modules/food/food.service.js");
    for (const opts of [
      { query: "biryani" },
      { query: "food", dietary: "veg" as const },
      { query: "healthy", budgetPaise: 30_000 },
    ]) {
      expect(searchFoodTraced(opts).quotes).toEqual(searchFood(opts));
    }
  });

  it("quoteRidesTraced returns exactly what quoteRides returns", async () => {
    const { quoteRides } = await import("../src/modules/rides/rides.service.js");
    const opts = { distanceKm: 12, rideMinutes: 25, vehicle: "auto" as const };
    expect(quoteRidesTraced(opts).quotes).toEqual(quoteRides(opts));
  });
});
