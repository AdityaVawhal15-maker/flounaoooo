import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { rankingDecisions } from "../src/modules/backoffice/reporting.service.js";
import { recordDecision } from "../src/modules/advisor/decisionLog.service.js";
import { recommendFood } from "../src/modules/food/food.service.js";

// Logging a decision is only half the commitment we made in the ONDC
// disclosure — an operator has to be able to read it back and say why an
// option won. These cover the read path end to end: a real ranking goes in,
// and a human-readable account of it comes out.

async function settle() {
  // recordDecision is deliberately fire-and-forget; give the write a tick.
  await new Promise((r) => setTimeout(r, 150));
}

describe("ranking decisions — operator read path", () => {
  beforeAll(async () => {
    await prisma.decisionLog.deleteMany({});
  });

  it("reads back a real recommendation with its scores and weights", async () => {
    const rec = recommendFood({ query: "biryani", priority: "balanced" });
    expect(rec).toBeTruthy();
    recordDecision({ userId: null, domain: "food", query: "biryani", trace: rec!.trace });
    await settle();

    const { decisions, total } = await rankingDecisions(10);
    expect(total).toBeGreaterThan(0);

    const d = decisions[0]!;
    expect(d.domain).toBe("food");
    expect(d.query).toBe("biryani");
    expect(d.priority).toBe("balanced");
    expect(d.weights).toEqual(rec!.trace.weights);
    expect(d.chosenKey).toBe(rec!.trace.chosenKey);
    expect(d.results.length).toBe(rec!.trace.scores.length);
    // Best-first ordering has to survive the JSON round-trip.
    expect(d.results[0]!.key).toBe(d.chosenKey);
  });

  it("explains the winner in terms an operator can act on", async () => {
    await prisma.decisionLog.deleteMany({});
    const rec = recommendFood({ query: "biryani", priority: "price" });
    recordDecision({ userId: null, domain: "food", query: "biryani", trace: rec!.trace });
    await settle();

    const { decisions } = await rankingDecisions(1);
    const text = decisions[0]!.explanation;
    // Names the margin, the reason, and the preference that drove it.
    expect(text).toMatch(/Scored \d+ against \d+/);
    expect(text).toMatch(/cheaper/i);
    expect(text).toMatch(/price/i);
  });

  it("records exclusions so a filtered-out result can be accounted for", async () => {
    await prisma.decisionLog.deleteMany({});
    const rec = recommendFood({ query: "food", dietary: "veg" });
    recordDecision({ userId: null, domain: "food", query: "food", trace: rec!.trace });
    await settle();

    const { decisions } = await rankingDecisions(1);
    const d = decisions[0]!;
    expect(d.excludedCount).toBeGreaterThan(0);
    expect(d.exclusions.some((e) => e.rule === "dietary_filter")).toBe(true);
  });

  it("survives a malformed row rather than taking the page down", async () => {
    await prisma.decisionLog.deleteMany({});
    await prisma.decisionLog.create({
      data: {
        domain: "food",
        query: "corrupt",
        priority: "balanced",
        weights: "{not json",
        personalized: false,
        candidateCount: 0,
        excludedCount: 0,
        results: "also not json",
        chosenKey: "none",
      },
    });

    const { decisions } = await rankingDecisions(1);
    expect(decisions[0]!.weights).toBeNull();
    expect(decisions[0]!.results).toEqual([]);
    expect(decisions[0]!.explanation).toBe("No options were scored.");
  });

  it("returns newest first, so the console shows recent activity", async () => {
    await prisma.decisionLog.deleteMany({});
    for (const q of ["first", "second", "third"]) {
      const rec = recommendFood({ query: "biryani" });
      recordDecision({ userId: null, domain: "food", query: q, trace: rec!.trace });
      await settle();
    }
    const { decisions } = await rankingDecisions(10);
    expect(decisions[0]!.query).toBe("third");
  });
});
