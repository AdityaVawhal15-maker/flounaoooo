import { prisma } from "../../lib/prisma.js";

// Community ratings. A rating only means something once a few people have left
// one, so a dish's shown rating is a blend of the catalog baseline and real
// user stars, weighted by how many ratings exist. That way one angry 1-star
// can't tank a dish, but a genuinely bad item drifts down over time.

const CONFIDENCE_AT = 10; // ratings needed before user opinion fully outweighs the baseline

export type CommunityRating = { average: number; count: number };

export async function communityRatings(
  domain: "food" | "ride",
  itemKeys: string[],
): Promise<Map<string, CommunityRating>> {
  if (itemKeys.length === 0) return new Map();
  const rows = await prisma.orderRating.groupBy({
    by: ["itemKey"],
    where: { domain, itemKey: { in: itemKeys } },
    _avg: { stars: true },
    _count: { stars: true },
  });
  const map = new Map<string, CommunityRating>();
  for (const r of rows) {
    map.set(r.itemKey, {
      average: r._avg.stars ?? 0,
      count: r._count.stars,
    });
  }
  return map;
}

// Bayesian-ish blend: with few ratings we mostly trust the baseline, with many
// we mostly trust the crowd. Rounded to 1dp, which is how ratings are shown.
export function blendRating(
  baseline: number,
  community: CommunityRating | undefined,
): number {
  if (!community || community.count === 0) return baseline;
  const w = Math.min(1, community.count / CONFIDENCE_AT);
  const blended = baseline * (1 - w) + community.average * w;
  return Math.round(blended * 10) / 10;
}

// Applies community ratings to anything carrying { rating } plus an id field.
export async function withCommunityRatings<
  T extends { rating: number },
>(
  domain: "food" | "ride",
  items: T[],
  keyOf: (item: T) => string,
): Promise<T[]> {
  if (items.length === 0) return items;
  const ratings = await communityRatings(domain, items.map(keyOf));
  if (ratings.size === 0) return items;
  return items.map((item) => ({
    ...item,
    rating: blendRating(item.rating, ratings.get(keyOf(item))),
  }));
}
