import { describe, expect, it } from "vitest";
import {
  recommendFood,
  searchFood,
  quotesForDish,
  allQuotes,
} from "../src/modules/food/food.service.js";

// Guards the free-text food matching an LLM feeds into recommendFood: taste
// descriptors expand to real dishes, filler words are ignored, and a vague
// query never surfaces a dessert as the top "I'm hungry" pick — while desserts
// stay fully reachable when actually asked for.

describe("food search — descriptors & fillers", () => {
  it("maps taste words to sensible dishes (never a dessert for 'spicy')", () => {
    for (const item of ["spicy", "something spicy", "spicy vegetarian dish"]) {
      const rec = recommendFood({ query: item, dietary: "veg", priority: "balanced" });
      expect(rec).toBeTruthy();
      expect(rec!.best.name.toLowerCase()).not.toContain("cake");
    }
    expect(recommendFood({ query: "healthy", priority: "balanced" })!.best.name)
      .toMatch(/bowl|salad|quinoa/i);
  });

  it("strips generic filler items ('popular dishes', 'food') and skips desserts", () => {
    for (const item of ["popular dishes", "food", "something to eat", "i'm hungry"]) {
      const rec = recommendFood({ query: item, priority: "balanced" });
      expect(rec).toBeTruthy();
      // A vague 'hungry' query must not top-pick a dessert.
      expect(rec!.best.name.toLowerCase()).not.toContain("cake");
    }
  });

  it("still reaches desserts when explicitly asked", () => {
    for (const item of ["something sweet", "cake", "dessert"]) {
      const rec = recommendFood({ query: item, priority: "balanced" });
      expect(rec!.best.name.toLowerCase()).toContain("cake");
    }
  });

  it("a filler word combined with a real descriptor keeps the descriptor", () => {
    const rec = recommendFood({ query: "popular spicy dishes", dietary: "veg", priority: "balanced" });
    expect(rec!.best.name.toLowerCase()).not.toContain("cake");
  });

  it("quotesForDish resolves any dish by id, desserts included", () => {
    const cake = quotesForDish("chocolate-cake");
    expect(cake.length).toBeGreaterThan(0);
    expect(cake[0]!.name.toLowerCase()).toContain("cake");
    // sorted cheapest-first
    for (let i = 1; i < cake.length; i++) {
      expect(cake[i]!.effectivePaise).toBeGreaterThanOrEqual(cake[i - 1]!.effectivePaise);
    }
    expect(quotesForDish("no-such-dish")).toEqual([]);
  });

  it("allQuotes covers the whole catalog including desserts (for feed stats)", () => {
    const all = allQuotes();
    expect(all.some((q) => q.name.toLowerCase().includes("cake"))).toBe(true);
    // searchFood('') deliberately excludes desserts — the two must differ.
    const searchEmpty = searchFood({ query: "" });
    expect(all.length).toBeGreaterThan(searchEmpty.length);
    expect(searchEmpty.some((q) => q.name.toLowerCase().includes("cake"))).toBe(false);
  });
});
