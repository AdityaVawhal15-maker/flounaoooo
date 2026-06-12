import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../../config/env.js";
import { intentSchema, type Intent, type LlmProvider } from "./types.js";
import { JSON_SCHEMA, SYSTEM_PROMPT } from "./prompt.js";

export class AnthropicProvider implements LlmProvider {
  name = "anthropic";
  private client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  async extractIntent(userMessage: string): Promise<Intent> {
    const response = await this.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: JSON_SCHEMA },
      },
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("LLM returned no text content");
    }
    // Validate against our schema even though the API enforces shape —
    // belt and suspenders before anything reaches business logic.
    return intentSchema.parse(JSON.parse(text.text));
  }
}
