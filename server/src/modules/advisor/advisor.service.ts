// Price-intelligence & timing engine.
// Primary: learned hour-of-day patterns from observed prices (priceHistory).
// Fallback (cold start): rule-based meal-window / commute-surge heuristics.

import { predictFromHistory } from "./priceHistory.service.js";
import type { DecisionContext } from "./context.service.js";

export type Advice = {
  action: "order_now" | "wait";
  message: string;
  // "history" once we have enough observed data, else "rules"
  source?: "history" | "rules";
  // present only for "wait"
  expectedSavingPaise?: number;
  waitMinutes?: number;
  // A short context note layered on top (e.g. weather) — additive, never
  // overrides the timing call.
  contextNote?: string;
};

type FoodWindow = {
  label: string;
  startHour: number; // inclusive
  endHour: number; // exclusive
  savingPaise: number;
};

// Typical platform promo windows (IST).
const FOOD_WINDOWS: FoodWindow[] = [
  { label: "lunch-hour deal", startHour: 12, endHour: 15, savingPaise: 4000 },
  { label: "evening snack offer", startHour: 16, endHour: 18, savingPaise: 2500 },
  { label: "dinner-time offer", startHour: 20, endHour: 23, savingPaise: 10000 },
];

const MAX_WORTH_WAITING_MINUTES = 120;

function minutesUntilHour(now: Date, hour: number): number {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

export function adviseFoodByRules(now: Date = new Date()): Advice {
  const hour = now.getHours();

  const active = FOOD_WINDOWS.find((w) => hour >= w.startHour && hour < w.endHour);
  if (active) {
    return {
      action: "order_now",
      message: `Good timing — the ${active.label} is live right now. Prices are at their best.`,
    };
  }

  // Closest upcoming window worth waiting for.
  const upcoming = FOOD_WINDOWS.map((w) => ({
    window: w,
    inMinutes: minutesUntilHour(now, w.startHour),
  }))
    .filter((u) => u.inMinutes <= MAX_WORTH_WAITING_MINUTES)
    .sort((a, b) => a.inMinutes - b.inMinutes)[0];

  if (upcoming) {
    const rupees = Math.round(upcoming.window.savingPaise / 100);
    return {
      action: "wait",
      message: `Flat ₹${rupees} off expected with the ${upcoming.window.label} in about ${formatWait(upcoming.inMinutes)}. Order now, or wait and save?`,
      expectedSavingPaise: upcoming.window.savingPaise,
      waitMinutes: upcoming.inMinutes,
    };
  }

  return {
    action: "order_now",
    message: "No better offer window coming up soon — now is a fine time to order.",
  };
}

// Commute surge windows: fares typically elevated, easing afterwards.
const RIDE_SURGE = [
  { startHour: 8, endHour: 11, dropPaise: 4000 },
  { startHour: 17, endHour: 21, dropPaise: 5000 },
];

export function adviseRideByRules(now: Date = new Date()): Advice {
  const hour = now.getHours();
  const surge = RIDE_SURGE.find((s) => hour >= s.startHour && hour < s.endHour);

  if (surge) {
    const minutesLeft = minutesUntilHour(now, surge.endHour);
    if (minutesLeft <= 45) {
      const rupees = Math.round(surge.dropPaise / 100);
      return {
        action: "wait",
        message: `Peak-hour pricing is easing in about ${formatWait(minutesLeft)} — fares may drop around ₹${rupees}.`,
        expectedSavingPaise: surge.dropPaise,
        waitMinutes: minutesLeft,
      };
    }
    return {
      action: "order_now",
      message:
        "It's peak commute time — fares are elevated everywhere, and waiting won't help for a while. Booking now is reasonable.",
    };
  }

  return {
    action: "order_now",
    message: "Off-peak right now — fares are at their lowest. Good time to book.",
  };
}

function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

// Weather context layered onto food advice: when it's wet, in-app delivery is
// the comfortable call and delivery times run a little longer.
function foodContextNote(ctx?: DecisionContext): string | undefined {
  if (!ctx) return undefined;
  const w = ctx.weather;
  if (w.condition === "heavy_rain")
    return "It's pouring out — delivery may run a bit slow, but you stay dry by ordering in.";
  if (w.condition === "rain" || (w.rainChance ?? 0) >= 0.5)
    return "Rain about — a good time to order in rather than head out.";
  return undefined;
}

// Weather context layered onto ride advice: rain drives demand and surge.
function rideContextNote(ctx?: DecisionContext): string | undefined {
  if (!ctx) return undefined;
  const w = ctx.weather;
  if (w.condition === "heavy_rain")
    return "Heavy rain — rides are in high demand and fares are surging. Book early if you must travel.";
  if (w.condition === "rain" || (w.rainChance ?? 0) >= 0.5)
    return "Rain expected — fares tend to rise and cabs get scarce. Booking sooner is safer.";
  return undefined;
}

// ---- History-first entry points (used by routes) ----
// Try learned patterns; fall back to rules until enough data accumulates.
// An optional DecisionContext layers a weather note on top of the timing call.

export async function adviseFood(
  dishKey: string | null,
  now: Date = new Date(),
  ctx?: DecisionContext,
): Promise<Advice> {
  const note = foodContextNote(ctx);
  if (dishKey) {
    const learned = await predictFromHistory("food", dishKey, now);
    if (learned) return note ? { ...learned, contextNote: note } : learned;
  }
  return { ...adviseFoodByRules(now), source: "rules", ...(note ? { contextNote: note } : {}) };
}

export async function adviseRide(
  vehicleKey: string | null,
  now: Date = new Date(),
  ctx?: DecisionContext,
): Promise<Advice> {
  const note = rideContextNote(ctx);
  if (vehicleKey) {
    const learned = await predictFromHistory("ride", vehicleKey, now);
    if (learned) return note ? { ...learned, contextNote: note } : learned;
  }
  return { ...adviseRideByRules(now), source: "rules", ...(note ? { contextNote: note } : {}) };
}
