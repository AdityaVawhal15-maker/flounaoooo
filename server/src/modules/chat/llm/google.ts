import { env } from "../../../config/env.js";
import { intentSchema, type Intent, type LlmProvider } from "./types.js";
import { SYSTEM_PROMPT } from "./prompt.js";

// The JSON contract appended to the system prompt — identical shape to the
// other providers so the firewall/intent schema stays the single source of truth.
const JSON_INSTRUCTION =
  `${SYSTEM_PROMPT}\n\nRespond ONLY with a JSON object: ` +
  `{"domain": "food"|"ride"|"shop"|"combo"|"greeting"|"out_of_scope", "reply": string, ` +
  `"food"?: {"item": string, "budgetPaise": number|null, "dietary": "veg"|"nonveg"|"any", "priority": "price"|"rating"|"speed"|"balanced"}, ` +
  `"ride"?: {"pickup": string|null, "drop": string, "vehicle": "bike"|"auto"|"cab"|"any", "priority": "price"|"rating"|"speed"|"balanced"}, ` +
  `"shop"?: {"item": string, "budgetPaise": number|null, "category": "electronics"|"fashion"|"home"|"appliances"|"any", "priority": "price"|"rating"|"speed"|"balanced"}}. ` +
  `Set priority from the user's words: "rating" for top-rated/best, "price" for cheap/budget, "speed" for fast/quick, else "balanced".`;

// Google AI Studio (Gemini) via the Generative Language REST API. Free-tier
// friendly — used for the bulk of test traffic in our hybrid LLM setup.
export class GoogleProvider implements LlmProvider {
  name = "google";

  private readonly model = env.GOOGLE_AI_MODEL;

  async extractIntent(userMessage: string): Promise<Intent> {
    // The key goes in a header, not the query string, so it never lands in
    // proxy/access logs, error traces, or crash reports — matching how the
    // Anthropic and DeepSeek adapters pass their credentials.
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GOOGLE_AI_API_KEY ?? "",
      },
      body: JSON.stringify({
        // System prompt as a leading user turn (v1beta supports systemInstruction
        // too, but folding it in keeps parity with the other adapters).
        systemInstruction: { parts: [{ text: JSON_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 512,
          temperature: 0.4,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Google AI request failed (${res.status})`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Google AI returned no content");
    return intentSchema.parse(JSON.parse(content));
  }
}
