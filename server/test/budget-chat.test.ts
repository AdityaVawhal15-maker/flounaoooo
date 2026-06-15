import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";

// Budget-aware chat: when a weekly food budget is set and the user doesn't
// name a budget in the message, recommendations respect what's left and carry
// a budget note. Uses the demo LLM provider (deterministic in tests).

async function sendChat(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  message: string,
) {
  const res = await agent
    .post("/api/chat/message")
    .send({ message })
    .expect(200);
  return res.body.message;
}

describe("budget-aware chat", () => {
  it("adds no budget note when no budget is set", async () => {
    const { agent } = await authedAgent();
    const msg = await sendChat(agent, "order biryani");
    expect(msg.recommendation?.type).toBe("food");
    expect(msg.recommendation.budgetNote).toBeUndefined();
  });

  it("caps the pick to the remaining weekly budget and notes it", async () => {
    const { agent } = await authedAgent();
    // ₹200 weekly budget, nothing spent → masala dosa (₹129) fits.
    await agent
      .put("/api/users/budget")
      .send({ weeklyBudgetRupees: 200 })
      .expect(200);

    const msg = await sendChat(agent, "order dosa");
    expect(msg.recommendation?.type).toBe("food");
    // The pick fits within the remaining ₹200…
    expect(msg.recommendation.best.effectivePaise).toBeLessThanOrEqual(20000);
    // …and the card explains the budget impact.
    expect(msg.recommendation.budgetNote).toMatch(/weekly food budget/i);
  });

  it("flags an over-budget pick honestly instead of hiding it", async () => {
    const { agent } = await authedAgent();
    // ₹150 budget but the cheapest biryani is ~₹229 → over budget.
    await agent
      .put("/api/users/budget")
      .send({ weeklyBudgetRupees: 150 })
      .expect(200);

    const msg = await sendChat(agent, "order biryani");
    expect(msg.recommendation?.type).toBe("food");
    // Still recommends the cheapest option, but warns it's over budget.
    expect(msg.recommendation.budgetNote).toMatch(/over your weekly food budget/i);
  });
});
