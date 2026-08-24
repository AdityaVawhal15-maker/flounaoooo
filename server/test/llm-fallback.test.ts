import { describe, expect, it, vi } from "vitest";
import { FallbackProvider } from "../src/modules/chat/llm/fallback.js";
import type { Intent, LlmProvider } from "../src/modules/chat/llm/types.js";

// A fallback chain that is never exercised is just an assumption. An expired
// Anthropic key once sent every request to the rule-based engine without
// anything failing loudly, which is the failure this exists to prevent.

const intent = (reply: string): Intent => ({ domain: "greeting", reply });

const ok = (name: string): LlmProvider => ({
  name,
  extractIntent: vi.fn(async () => intent(`from ${name}`)),
});

const broken = (name: string, message = "provider is down"): LlmProvider => ({
  name,
  extractIntent: vi.fn(async () => {
    throw new Error(message);
  }),
});

describe("LLM provider chain", () => {
  it("uses the first provider and does not touch the rest", async () => {
    const second = ok("deepseek");
    const chain = new FallbackProvider([ok("anthropic"), second]);

    expect((await chain.extractIntent("hi")).reply).toBe("from anthropic");
    expect(second.extractIntent).not.toHaveBeenCalled();
  });

  it("falls through to the next provider when one fails", async () => {
    const chain = new FallbackProvider([broken("anthropic"), ok("deepseek")]);
    expect((await chain.extractIntent("hi")).reply).toBe("from deepseek");
  });

  it("keeps going down the chain, not just one step", async () => {
    const chain = new FallbackProvider([
      broken("anthropic"),
      broken("deepseek"),
      ok("google"),
    ]);
    expect((await chain.extractIntent("hi")).reply).toBe("from google");
  });

  it("throws when every provider fails, so the caller can degrade", async () => {
    // Swallowing here would fabricate an intent. The route already falls back
    // to the rule-based engine, and that decision belongs to it.
    const chain = new FallbackProvider([
      broken("anthropic", "429 rate limited"),
      broken("deepseek", "503"),
    ]);
    await expect(chain.extractIntent("hi")).rejects.toThrow("503");
  });

  it("reports the chain in its name, so logs say what is configured", () => {
    expect(new FallbackProvider([ok("anthropic"), ok("deepseek")]).name).toBe(
      "anthropic -> deepseek",
    );
  });

  it("refuses to be constructed empty rather than failing at request time", () => {
    expect(() => new FallbackProvider([])).toThrow(/at least one/i);
  });

  it("tries every provider exactly once per request", async () => {
    const a = broken("anthropic");
    const b = ok("deepseek");
    const chain = new FallbackProvider([a, b]);
    await chain.extractIntent("hi");
    expect(a.extractIntent).toHaveBeenCalledTimes(1);
    expect(b.extractIntent).toHaveBeenCalledTimes(1);
  });
});
