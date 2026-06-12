// Price-intelligence & timing engine (rule-based v1).
// Encodes real Indian platform pricing patterns: meal-window food offers and
// commute-hour ride surge. Swapped for an ML model on live data later —
// the response shape is the contract, not the rules.

export type Advice = {
  action: "order_now" | "wait";
  message: string;
  // present only for "wait"
  expectedSavingPaise?: number;
  waitMinutes?: number;
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

export function adviseFood(now: Date = new Date()): Advice {
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

export function adviseRide(now: Date = new Date()): Advice {
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
