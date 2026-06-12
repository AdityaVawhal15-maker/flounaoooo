import type { Intent, LlmProvider } from "./types.js";

// Keyless fallback so the whole product runs without any LLM account.
// Simple keyword rules — replaced in production by Anthropic/DeepSeek.
const FOOD_WORDS =
  /\b(biryani|pizza|burger|dosa|pasta|noodles|thali|paneer|chicken|veg|tiffin|breakfast|lunch|dinner|snack|dessert|cake|ice ?cream|samosa|idli|paratha|roll|shawarma|momos|food|eat|hungry|order)\b/i;
const RIDE_WORDS =
  /\b(ride|cab|taxi|auto|bike|uber|ola|rapido|drop|pickup|pick me|airport|station|office|go to|take me|book)\b/i;
const GREETING_WORDS = /^(hi|hii+|hello|hey|good (morning|afternoon|evening)|thanks|thank you|namaste)\b/i;

const OUT_OF_SCOPE_REPLY =
  "I can help you order food or book rides — what would you like?";

function parseBudget(message: string): number | null {
  const m = message.match(/(?:under|below|less than|within|max|upto|up to)?\s*(?:₹|rs\.?|inr)\s*(\d{2,5})/i);
  return m?.[1] ? Number(m[1]) * 100 : null;
}

function extractFood(message: string) {
  const itemMatch = message.match(
    /\b(biryani|pizza|burger|dosa|pasta|noodles|thali|paneer|samosa|idli|paratha|roll|shawarma|momos|cake|ice ?cream)\b/i,
  );
  const dietary = /\bveg(etarian)?\b/i.test(message)
    ? ("veg" as const)
    : /\b(non[- ]?veg|chicken|mutton|fish|egg)\b/i.test(message)
      ? ("nonveg" as const)
      : ("any" as const);
  return {
    item: itemMatch?.[0]?.toLowerCase() ?? "popular dishes",
    budgetPaise: parseBudget(message),
    dietary,
  };
}

function extractRide(message: string) {
  const dropMatch = message.match(/(?:to|towards|till)\s+([a-z0-9 ,.'-]{3,60})/i);
  const vehicle = /bike/i.test(message)
    ? ("bike" as const)
    : /auto/i.test(message)
      ? ("auto" as const)
      : /cab|taxi|car/i.test(message)
        ? ("cab" as const)
        : ("any" as const);
  return {
    pickup: null,
    drop: dropMatch?.[1]?.trim() ?? "your destination",
    vehicle,
  };
}

export class DemoProvider implements LlmProvider {
  name = "demo";

  async extractIntent(message: string): Promise<Intent> {
    if (GREETING_WORDS.test(message.trim())) {
      return {
        domain: "greeting",
        reply: "Hey! Ask me for food or a ride and I'll find you the best deal.",
      };
    }

    // Both in one message → combo ("order biryani and book a cab home").
    if (RIDE_WORDS.test(message) && FOOD_WORDS.test(message)) {
      return {
        domain: "combo",
        reply: "On it — sorting out both your food and your ride.",
        food: extractFood(message),
        ride: extractRide(message),
      };
    }

    if (RIDE_WORDS.test(message) && !FOOD_WORDS.test(message)) {
      return {
        domain: "ride",
        reply: "On it — comparing ride options for you.",
        ride: extractRide(message),
      };
    }

    if (FOOD_WORDS.test(message)) {
      return {
        domain: "food",
        reply: "Got it — finding the best deal for you.",
        food: extractFood(message),
      };
    }

    return { domain: "out_of_scope", reply: OUT_OF_SCOPE_REPLY };
  }
}
