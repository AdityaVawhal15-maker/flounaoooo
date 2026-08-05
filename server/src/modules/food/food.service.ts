import { dishes, type Dish, type Listing } from "../../data/restaurants.js";
import {
  scoreOptions,
  reasonForPriority,
  type Priority,
  type PickReason,
  type Personalization,
} from "../advisor/scoring.js";

export type FoodQuote = {
  dishId: string;
  name: string;
  restaurant: string;
  rating: number;
  tag: string;
  dietary: "veg" | "nonveg";
  reviewSummary: string;
  platform: string;
  fulfillment: "in_app"; // always in-app; ONDC routes to the seller
  basePaise: number;
  deliveryFeePaise: number;
  offers: { label: string; discountPaise: number }[];
  effectivePaise: number;
  etaMinutes: number;
};

export type FoodRecommendation = {
  best: FoodQuote;
  alternatives: FoodQuote[];
  why: string;
  pickReason: PickReason;
};

function effectivePrice(listing: Listing): number {
  const discounts = listing.offers.reduce((sum, o) => sum + o.discountPaise, 0);
  return Math.max(0, listing.basePaise + listing.deliveryFeePaise - discounts);
}

function toQuotes(dish: Dish): FoodQuote[] {
  return dish.listings.map((l) => ({
    dishId: dish.id,
    name: dish.name,
    restaurant: dish.restaurant,
    rating: dish.rating,
    tag: dish.tag,
    dietary: dish.dietary,
    reviewSummary: dish.reviewSummary,
    platform: l.platform,
    // Everything is bought in-app — the user pays Radiues and the order is
    // routed to the seller through ONDC. No redirect to any external app.
    fulfillment: "in_app",
    basePaise: l.basePaise,
    deliveryFeePaise: l.deliveryFeePaise,
    offers: l.offers,
    effectivePaise: effectivePrice(l),
    etaMinutes: l.etaMinutes,
  }));
}

// Every quote for a specific dish by id (all platforms), cheapest first, or
// [] if the id is unknown. A direct catalog lookup — does not go through the
// descriptor/fallback search logic, so callers that need an exact dish
// (price alerts, order pricing) get a stable answer regardless of how the
// text search is tuned.
export function quotesForDish(dishId: string): FoodQuote[] {
  const dish = dishes.find((d) => d.id === dishId);
  if (!dish) return [];
  return toQuotes(dish).sort((a, b) => a.effectivePaise - b.effectivePaise);
}

// Every quote in the catalog (all dishes, all platforms) — for aggregate stats
// like the feed's "fastest delivery". Distinct from searchFood(""), which is a
// tuned text search (it excludes desserts on an empty query).
export function allQuotes(): FoodQuote[] {
  return dishes.flatMap(toQuotes);
}

// Taste/mood descriptors → catalog keywords. Chat requests arrive as free
// text ("something spicy", "light dinner") that no dish keyword contains —
// without this the search falls through to the whole catalog and the scorer
// can pick something absurd (a dessert for "spicy"). Keys are what users say;
// values are keywords that exist in the catalog.
const DESCRIPTOR_KEYWORDS: Record<string, string[]> = {
  spicy: ["biryani", "momos", "roll", "thali"],
  hot: ["biryani", "momos"],
  sweet: ["cake", "dessert"],
  dessert: ["cake", "ice cream"],
  light: ["salad", "dosa", "momos"],
  healthy: ["salad", "bowl", "quinoa"],
  protein: ["salad", "chicken", "paneer"],
  breakfast: ["dosa", "idli"],
  tiffin: ["dosa", "idli"],
  snack: ["momos", "roll"],
  snacks: ["momos", "roll"],
  lunch: ["thali", "biryani", "meals"],
  dinner: ["biryani", "thali", "pizza"],
  chinese: ["momos"],
  italian: ["pizza", "pasta"],
  cheesy: ["pizza", "pasta"],
};

// Generic filler words an LLM sometimes emits as the "item" ("popular dishes",
// "food") — these should NOT be matched literally (nothing in the catalog says
// "popular"), or the search wrongly falls through to the whole catalog and the
// scorer can pick anything. Stripped before matching so real descriptors and
// dish names in the same phrase still count.
const FILLER_WORDS = new Set([
  "popular", "dishes", "dish", "food", "foods", "something", "eat", "order",
  "want", "get", "me", "a", "an", "the", "some", "any", "to", "for", "please",
  "good", "nice", "tasty", "yummy", "recommend", "recommendation", "hungry",
  "i", "im", "we", "you", "need", "like", "would", "give", "have", "craving",
  "today", "now", "please", "can", "could", "will",
]);

export function searchFood(opts: {
  query: string;
  budgetPaise?: number | null;
  dietary?: "veg" | "nonveg" | "any";
}): FoodQuote[] {
  const rawTerms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);
  const direct = rawTerms.filter((t) => !FILLER_WORDS.has(t));
  const terms = [...direct, ...direct.flatMap((t) => DESCRIPTOR_KEYWORDS[t] ?? [])];

  let matched =
    terms.length === 0
      ? []
      : dishes.filter((d) =>
          terms.some((t) =>
            // Loose substring matching only for terms long enough to be a real
            // word (≥3 chars). A stray 1–2 char token ("i", "hi") must match a
            // keyword exactly or not at all — otherwise it matches half the
            // catalog and dilutes a specific request like "pizza" until the
            // scorer picks the highest-rated dish (a dessert) instead.
            t.length >= 3
              ? d.keywords.some((k) => k.includes(t) || t.includes(k)) ||
                d.name.toLowerCase().includes(t)
              : d.keywords.includes(t),
          ),
        );
  if (matched.length === 0) {
    // A term-less / unmatched query ("food", "I'm hungry") sees the catalog,
    // but excludes desserts — nobody who just says "hungry" wants cake as the
    // top pick. Desserts stay fully reachable when actually asked for (the
    // "sweet"/"cake"/"dessert" descriptors above match them directly).
    matched = dishes.filter((d) => !d.keywords.includes("dessert"));
  }

  if (opts.dietary && opts.dietary !== "any") {
    matched = matched.filter((d) => d.dietary === opts.dietary);
  }

  let quotes = matched.flatMap(toQuotes);
  if (opts.budgetPaise) {
    const within = quotes.filter((q) => q.effectivePaise <= opts.budgetPaise!);
    if (within.length > 0) quotes = within;
  }
  return quotes.sort((a, b) => a.effectivePaise - b.effectivePaise);
}

// The "decision" step: score every option on price, rating and speed weighted
// by what the user asked for (priority), then pick the highest-scoring one.
// This is the ratings-aware engine — "top-rated" genuinely changes the winner.
export function recommendFood(
  opts: Parameters<typeof searchFood>[0] & {
    priority?: Priority;
    personal?: Personalization;
  },
): FoodRecommendation | null {
  const quotes = searchFood(opts);
  if (quotes.length === 0) return null;

  const priority = opts.priority ?? "balanced";
  const ranked = scoreOptions(
    quotes.map((q) => ({
      pricePaise: q.effectivePaise,
      rating: q.rating,
      etaMinutes: q.etaMinutes,
      name: q.name,
      quote: q,
    })),
    priority,
    opts.personal,
  );

  const best = ranked[0]!.item.quote;
  const cheapest = [...quotes].sort((a, b) => a.effectivePaise - b.effectivePaise)[0]!;
  const topRated = [...quotes].sort((a, b) => b.rating - a.rating)[0]!;

  const alternatives = ranked
    .slice(1)
    .filter((r) => !(r.item.quote.platform === best.platform && r.item.quote.dishId === best.dishId))
    .slice(0, 3)
    .map((r) => r.item.quote);

  // Savings vs the cheapest alternative platform for the same dish (honest:
  // only positive when the pick really is the cheapest, or near it).
  const saving = Math.max(0, cheapest.effectivePaise - best.effectivePaise);

  let why: string;
  if (priority === "rating") {
    why = `Top-rated pick — ${best.rating}★ at ${best.restaurant}`;
    if (best.dishId === cheapest.dishId && best.platform === cheapest.platform)
      why += ", and it's the best price too";
  } else if (priority === "speed") {
    why = `Fastest good option — arrives in ${best.etaMinutes} min, rated ${best.rating}★`;
  } else if (priority === "price") {
    why = `Best effective price after offers`;
    if (saving > 0) why += ` — you save ₹${Math.round(saving / 100)} vs the next option`;
  } else {
    // balanced: explain the trade-off it optimised
    why = `Best overall — ${best.rating}★, ${best.etaMinutes} min`;
    if (saving > 0) why += `, and ₹${Math.round(saving / 100)} cheaper than the next`;
    else why += ` — best value right now`;
  }
  if (topRated.rating > best.rating && priority !== "rating") {
    why += `. Want the highest rated? ${topRated.restaurant} is ${topRated.rating}★`;
  }

  return { best, alternatives, why, pickReason: reasonForPriority(priority) };
}
