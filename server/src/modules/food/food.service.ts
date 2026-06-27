import { dishes, type Dish, type Listing } from "../../data/restaurants.js";
import {
  scoreOptions,
  reasonForPriority,
  type Priority,
  type PickReason,
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
  fulfillment: "in_app" | "redirect";
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
    // ONDC checks out in-app (primary revenue); closed platforms deep-link.
    fulfillment: l.platform === "ondc" ? "in_app" : "redirect",
    basePaise: l.basePaise,
    deliveryFeePaise: l.deliveryFeePaise,
    offers: l.offers,
    effectivePaise: effectivePrice(l),
    etaMinutes: l.etaMinutes,
  }));
}

export function searchFood(opts: {
  query: string;
  budgetPaise?: number | null;
  dietary?: "veg" | "nonveg" | "any";
}): FoodQuote[] {
  const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);

  let matched = dishes.filter((d) =>
    terms.some(
      (t) =>
        d.keywords.some((k) => k.includes(t) || t.includes(k)) ||
        d.name.toLowerCase().includes(t),
    ),
  );
  if (matched.length === 0) matched = dishes; // generic queries see the catalog

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
  opts: Parameters<typeof searchFood>[0] & { priority?: Priority },
): FoodRecommendation | null {
  const quotes = searchFood(opts);
  if (quotes.length === 0) return null;

  const priority = opts.priority ?? "balanced";
  const ranked = scoreOptions(
    quotes.map((q) => ({
      pricePaise: q.effectivePaise,
      rating: q.rating,
      etaMinutes: q.etaMinutes,
      quote: q,
    })),
    priority,
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
    why = `Top-rated pick — ${best.rating}★ at ${best.restaurant} on ${best.platform.toUpperCase()}`;
    if (best.dishId === cheapest.dishId && best.platform === cheapest.platform)
      why += ", and it's the best price too";
  } else if (priority === "speed") {
    why = `Fastest good option — arrives in ${best.etaMinutes} min, rated ${best.rating}★`;
  } else if (priority === "price") {
    why = `Best effective price after offers on ${best.platform.toUpperCase()}`;
    if (saving > 0) why += ` — you save ₹${Math.round(saving / 100)} vs the next option`;
  } else {
    // balanced: explain the trade-off it optimised
    why = `Best overall — ${best.rating}★, ${best.etaMinutes} min`;
    if (saving > 0) why += `, and ₹${Math.round(saving / 100)} cheaper than the next`;
    else why += ` on ${best.platform.toUpperCase()}`;
  }
  if (topRated.rating > best.rating && priority !== "rating") {
    why += `. Want the highest rated? ${topRated.restaurant} is ${topRated.rating}★`;
  }

  return { best, alternatives, why, pickReason: reasonForPriority(priority) };
}
