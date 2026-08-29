import { dishes } from "../../data/restaurants.js";
import { quotesForDish } from "../food/food.service.js";

// The group deal.
//
// When four people separately order four biryanis, the restaurant already sells
// the thing they actually want, cheaper, and nobody looks for it because the
// menu is browsed one person at a time. This finds it.
//
// Two rules keep the suggestion honest rather than persuasive:
//
//   · the pack must genuinely feed the group — a "serves 4" pack is not offered
//     to five people, because they would end up ordering again
//   · the saving is a real price difference between real catalogue items, never
//     a discount invented at checkout. If the pack is not cheaper than what is
//     already in the cart, there is no suggestion, and saying nothing is the
//     correct output.
//
// It compares only the items that the pack would actually replace. A group with
// four biryanis and one lassi is told what the biryanis cost, not what the whole
// cart costs, because otherwise the "you save" number would be a lie about the
// lassi.

export type GroupSuggestion = {
  dishId: string;
  name: string;
  restaurant: string;
  serves: number;
  includes: string[];
  /** Price of the pack on this cart's platform, in paise. */
  packPaise: number;
  /** What the items it replaces cost right now, in paise. */
  currentPaise: number;
  savingPaise: number;
  /** The theme everyone converged on, e.g. "biryani". */
  theme: string;
  /** The cart items the pack would replace. */
  replacesItemIds: string[];
  /** How many distinct people ordered into the theme. */
  peopleAgreeing: number;
};

type CartItem = {
  id: string;
  userId: string;
  dishId: string;
  pricePaise: number;
  qty: number;
};

/** Keywords too broad to be a theme — nearly everything is "rice" or "veg". */
const TOO_BROAD = new Set(["rice", "veg", "nonveg", "pack", "family", "party", "platter"]);

/**
 * Finds the best pack for what this cart already holds, or null.
 *
 * Null is the common and correct answer. A suggestion that fires on every cart
 * would be an upsell, and people learn to dismiss those without reading.
 */
export function suggestForCart(opts: {
  items: CartItem[];
  platform: string;
  memberCount: number;
}): GroupSuggestion | null {
  const { items, platform, memberCount } = opts;
  if (items.length < 2) return null;

  const byId = new Map(dishes.map((d) => [d.id, d]));

  // Which themes has the group converged on, and who agreed on each. Counting
  // people rather than items is deliberate: one person ordering three biryanis
  // is not a group deciding anything.
  const themePeople = new Map<string, Set<string>>();
  for (const item of items) {
    const dish = byId.get(item.dishId);
    if (!dish || dish.serves) continue; // a pack is not evidence of a theme
    for (const keyword of dish.keywords) {
      if (TOO_BROAD.has(keyword)) continue;
      const set = themePeople.get(keyword) ?? new Set<string>();
      set.add(item.userId);
      themePeople.set(keyword, set);
    }
  }

  let best: GroupSuggestion | null = null;

  for (const [theme, people] of themePeople) {
    if (people.size < 2) continue; // not a group decision

    const matching = items.filter((i) => {
      const dish = byId.get(i.dishId);
      return dish && !dish.serves && dish.keywords.includes(theme);
    });
    if (matching.length === 0) continue;

    const currentPaise = matching.reduce((s, i) => s + i.pricePaise * i.qty, 0);
    const heads = matching.reduce((s, i) => s + i.qty, 0);

    for (const dish of dishes) {
      if (!dish.serves || !dish.keywords.includes(theme)) continue;
      // It has to feed everyone the items it replaces were feeding, and the
      // group as it stands. Under-feeding them is not a saving.
      if (dish.serves < Math.max(heads, memberCount)) continue;

      const quote = quotesForDish(dish.id).find((q) => q.platform === platform);
      if (!quote) continue;
      const packPaise = quote.effectivePaise;
      if (packPaise >= currentPaise) continue; // no saving, no suggestion

      const saving = currentPaise - packPaise;
      if (!best || saving > best.savingPaise) {
        best = {
          dishId: dish.id,
          name: dish.name,
          restaurant: dish.restaurant,
          serves: dish.serves,
          includes: dish.includes ?? [],
          packPaise,
          currentPaise,
          savingPaise: saving,
          theme,
          replacesItemIds: matching.map((i) => i.id),
          peopleAgreeing: people.size,
        };
      }
    }
  }

  return best;
}
