import { env } from "../../../config/env.js";
import { intentSchema, type Intent, type LlmProvider } from "./types.js";
import { SYSTEM_PROMPT } from "./prompt.js";

// DeepSeek exposes an OpenAI-compatible chat API with JSON mode.
export class DeepseekProvider implements LlmProvider {
  name = "deepseek";

  async extractIntent(userMessage: string): Promise<Intent> {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object: {"domain": "food"|"ride"|"shop"|"combo"|"greeting"|"out_of_scope", "reply": string, "food"?: {"item": string, "budgetPaise": number|null, "dietary": "veg"|"nonveg"|"any", "priority": "price"|"rating"|"speed"|"balanced"}, "ride"?: {"pickup": string|null, "drop": string, "vehicle": "bike"|"auto"|"cab"|"any", "priority": "price"|"rating"|"speed"|"balanced", "scheduleAt": "HH:mm"|null}, "shop"?: {"item": string, "budgetPaise": number|null, "category": "electronics"|"fashion"|"home"|"appliances"|"any", "priority": "price"|"rating"|"speed"|"balanced"}}. Set priority from the user's words: "rating" for top-rated/best, "price" for cheap/budget, "speed" for fast/quick, else "balanced".`,
          },
          { role: "user", content: userMessage },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`DeepSeek request failed (${res.status})`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no content");
    return intentSchema.parse(JSON.parse(content));
  }
}
