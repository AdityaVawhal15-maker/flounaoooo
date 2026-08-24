import type { Intent, LlmProvider } from "./types.js";

// Tries each provider in turn and returns the first intent one produces.
//
// A single provider is a single point of failure for the whole product: when it
// rate-limits or has an outage, every request drops to the rule-based engine
// and the app quietly stops being an AI product. Chaining means a Claude outage
// is served by DeepSeek, and a DeepSeek outage by Gemini, before anything
// degrades.
//
// Order is deliberate rather than round-robin — the configured provider is
// always tried first, so this changes nothing on the happy path. Failures are
// logged with the provider that failed and the one that took over, because a
// silent switch hides both the outage and the cost moving to another vendor.
export class FallbackProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly chain: LlmProvider[]) {
    if (chain.length === 0) throw new Error("FallbackProvider needs at least one provider");
    this.name = chain.map((p) => p.name).join(" -> ");
  }

  async extractIntent(userMessage: string): Promise<Intent> {
    let lastError: unknown;

    for (let i = 0; i < this.chain.length; i++) {
      const provider = this.chain[i]!;
      try {
        const intent = await provider.extractIntent(userMessage);
        // Only worth saying when it was not the first choice — otherwise this
        // would log on every single request.
        if (i > 0) {
          console.warn(`[llm] served by ${provider.name} after ${i} provider(s) failed`);
        }
        return intent;
      } catch (err) {
        lastError = err;
        const next = this.chain[i + 1];
        console.error(
          `[llm] ${provider.name} failed: ${err instanceof Error ? err.message : String(err)}` +
            (next ? ` — falling back to ${next.name}` : " — no providers left"),
        );
      }
    }

    // Every provider failed. Throw rather than invent an intent: the caller
    // already degrades to the rule-based engine, and that decision belongs
    // there, not buried in here.
    throw lastError instanceof Error
      ? lastError
      : new Error("all LLM providers failed");
  }
}
