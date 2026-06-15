import { env } from "../../../config/env.js";
import type { LlmProvider } from "./types.js";
import { AnthropicProvider } from "./anthropic.js";
import { GoogleProvider } from "./google.js";
import { DeepseekProvider } from "./deepseek.js";
import { DemoProvider } from "./demo.js";

// Provider selection is config-only — swapping LLMs never touches business logic.
function buildProvider(): LlmProvider {
  switch (env.LLM_PROVIDER) {
    case "anthropic":
      if (!env.ANTHROPIC_API_KEY) {
        console.warn("[llm] LLM_PROVIDER=anthropic but no key set — using demo mode");
        return new DemoProvider();
      }
      return new AnthropicProvider();
    case "google":
      if (!env.GOOGLE_AI_API_KEY) {
        console.warn("[llm] LLM_PROVIDER=google but no key set — using demo mode");
        return new DemoProvider();
      }
      return new GoogleProvider();
    case "deepseek":
      if (!env.DEEPSEEK_API_KEY) {
        console.warn("[llm] LLM_PROVIDER=deepseek but no key set — using demo mode");
        return new DemoProvider();
      }
      return new DeepseekProvider();
    default:
      return new DemoProvider();
  }
}

export const llm: LlmProvider = buildProvider();
export const demoFallback = new DemoProvider();
