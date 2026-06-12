import { dishes, type Dish, type Listing } from "../../data/restaurants.js";

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

// The "decision" step: cheapest effective price wins; the fastest option is
// surfaced as the alternative when it beats the winner on time.
export function recommendFood(
  opts: Parameters<typeof searchFood>[0],
): FoodRecommendation | null {
  const quotes = searchFood(opts);
  const best = quotes[0];
  if (!best) return null;

  const fastest = quotes.reduce((a, b) => (b.etaMinutes < a.etaMinutes ? b : a), best);
  const alternatives = quotes
    .filter((q) => !(q.platform === best.platform && q.dishId === best.dishId))
    .slice(0, 3);

  const saving =
    alternatives.length > 0
      ? Math.max(0, (alternatives[0]?.effectivePaise ?? best.effectivePaise) - best.effectivePaise)
      : 0;

  let why = `Best effective price after offers on ${best.platform.toUpperCase()}`;
  if (saving > 0) why += ` — you save ₹${Math.round(saving / 100)} vs the next option`;
  if (fastest !== best && fastest.etaMinutes < best.etaMinutes) {
    why += `. Need it faster? ${fastest.platform.toUpperCase()} delivers in ${fastest.etaMinutes} min`;
  }

  return { best, alternatives, why };
}
