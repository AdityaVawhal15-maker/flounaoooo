import { products, type Product, type ProductListing } from "../../data/products.js";

export type ProductQuote = {
  productId: string;
  name: string;
  brand: string;
  category: string;
  rating: number;
  reviews: number;
  tag: string;
  reviewSummary: string;
  platform: string;
  basePaise: number;
  offers: { label: string; discountPaise: number }[];
  effectivePaise: number;
  deliveryDays: number;
  inStock: boolean;
};

export type ProductRecommendation = {
  best: ProductQuote;
  alternatives: ProductQuote[];
  why: string;
};

function effectivePrice(listing: ProductListing): number {
  const discounts = listing.offers.reduce((sum, o) => sum + o.discountPaise, 0);
  return Math.max(0, listing.basePaise - discounts);
}

function toQuotes(product: Product): ProductQuote[] {
  return product.listings.map((l) => ({
    productId: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    rating: product.rating,
    reviews: product.reviews,
    tag: product.tag,
    reviewSummary: product.reviewSummary,
    platform: l.platform,
    basePaise: l.basePaise,
    offers: l.offers,
    effectivePaise: effectivePrice(l),
    deliveryDays: l.deliveryDays,
    inStock: l.inStock,
  }));
}

export function searchProducts(opts: {
  query: string;
  budgetPaise?: number | null;
  category?: string | null;
}): ProductQuote[] {
  const terms = opts.query.toLowerCase().split(/\s+/).filter(Boolean);

  let matched = products.filter((p) =>
    terms.some(
      (t) =>
        p.keywords.some((k) => k.includes(t) || t.includes(k)) ||
        p.name.toLowerCase().includes(t) ||
        p.brand.toLowerCase().includes(t),
    ),
  );
  if (matched.length === 0) matched = products; // generic browse

  if (opts.category) {
    matched = matched.filter((p) => p.category === opts.category);
  }

  let quotes = matched.flatMap(toQuotes).filter((q) => q.inStock);
  if (opts.budgetPaise) {
    const within = quotes.filter((q) => q.effectivePaise <= opts.budgetPaise!);
    if (within.length > 0) quotes = within;
  }
  return quotes.sort((a, b) => a.effectivePaise - b.effectivePaise);
}

// Decision step: cheapest effective price wins; the fastest-delivery option is
// surfaced when it beats the winner on speed.
export function recommendProduct(
  opts: Parameters<typeof searchProducts>[0],
): ProductRecommendation | null {
  const quotes = searchProducts(opts);
  const best = quotes[0];
  if (!best) return null;

  const alternatives = quotes
    .filter((q) => !(q.platform === best.platform && q.productId === best.productId))
    .slice(0, 3);

  const saving =
    alternatives.length > 0
      ? Math.max(0, (alternatives[0]?.effectivePaise ?? best.effectivePaise) - best.effectivePaise)
      : 0;

  const fastest = quotes.reduce((a, b) => (b.deliveryDays < a.deliveryDays ? b : a), best);

  let why = `Lowest effective price after offers on ${best.platform}`;
  if (saving > 0) why += ` — you save ₹${Math.round(saving / 100)} vs the next option`;
  if (fastest !== best && fastest.deliveryDays < best.deliveryDays) {
    why += `. Need it sooner? ${fastest.platform} delivers in ${fastest.deliveryDays} day${fastest.deliveryDays > 1 ? "s" : ""}`;
  }

  return { best, alternatives, why };
}
