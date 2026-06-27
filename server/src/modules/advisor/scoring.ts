// The decision engine's scoring core. Radiues does not pick "cheapest, period" —
// it scores each option on price, rating and speed, weighted by what the user
// actually asked for. "top-rated" raises the rating weight, "cheap" raises
// price, "fast" raises speed. This is what makes the recommendation the
// *smartest* choice, not just the lowest number — and it stays deterministic
// and tamper-proof (the AI only chooses the priority; the math is ours).

export type Priority = "price" | "rating" | "speed" | "balanced";

// The basis on which the winning option was chosen — drives the UI badge.
export type PickReason = "top_rated" | "best_price" | "fastest" | "best_overall";

export function reasonForPriority(priority: Priority): PickReason {
  switch (priority) {
    case "rating":
      return "top_rated";
    case "price":
      return "best_price";
    case "speed":
      return "fastest";
    default:
      return "best_overall";
  }
}

export type Weights = { price: number; rating: number; speed: number };

// Weight presets per priority. They always sum to 1 so scores stay comparable.
const WEIGHTS: Record<Priority, Weights> = {
  price: { price: 0.7, rating: 0.2, speed: 0.1 },
  rating: { price: 0.2, rating: 0.65, speed: 0.15 },
  speed: { price: 0.25, rating: 0.2, speed: 0.55 },
  balanced: { price: 0.45, rating: 0.35, speed: 0.2 },
};

export function weightsFor(priority: Priority): Weights {
  return WEIGHTS[priority] ?? WEIGHTS.balanced;
}

// Normalise a value to 0..1 where 1 is best. For price and ETA, lower is better
// (inverted); for rating, higher is better.
function normLowerBetter(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return 1 - (value - min) / (max - min);
}
function normHigherBetter(value: number, min: number, max: number): number {
  if (max <= min) return 1;
  return (value - min) / (max - min);
}

export type Scorable = {
  pricePaise: number;
  rating: number; // 0..5
  etaMinutes: number;
};

// Scores a list of options (0..100) and returns them sorted best-first, with
// the score attached. Pure ranking — callers map their own quote shape in.
export function scoreOptions<T extends Scorable>(
  items: T[],
  priority: Priority,
): { item: T; score: number }[] {
  if (items.length === 0) return [];
  const w = weightsFor(priority);

  const prices = items.map((i) => i.pricePaise);
  const ratings = items.map((i) => i.rating);
  const etas = items.map((i) => i.etaMinutes);
  const pMin = Math.min(...prices),
    pMax = Math.max(...prices);
  const rMin = Math.min(...ratings),
    rMax = Math.max(...ratings);
  const eMin = Math.min(...etas),
    eMax = Math.max(...etas);

  return items
    .map((item) => {
      const priceScore = normLowerBetter(item.pricePaise, pMin, pMax);
      const ratingScore = normHigherBetter(item.rating, rMin, rMax);
      const speedScore = normLowerBetter(item.etaMinutes, eMin, eMax);
      const score = Math.round(
        (priceScore * w.price + ratingScore * w.rating + speedScore * w.speed) * 100,
      );
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);
}
