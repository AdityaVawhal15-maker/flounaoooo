// Decision Intelligence — Faculty 4: Proactive prediction.
//
// The standout behaviour: Radiues doesn't just answer questions, it gets ahead
// of them. If a user books home→office at ~8:55am every day and rain is forecast
// for that window, we surface a heads-up *before* they ask — "rain expected
// around your 8:55 ride, leave 15 min early or it'll surge."
//
// Built on the two faculties below it: Memory (recurring routines) + Context
// (weather/time). Pure and deterministic given a profile + context, so it tests
// cleanly and never fabricates — a prediction only fires when a real routine
// meets a real disruption signal.

import type { DecisionProfile } from "./decisionProfile.service.js";
import { buildDecisionProfile } from "./decisionProfile.service.js";
import type { DecisionContext } from "./context.service.js";
import { buildContext } from "./context.service.js";

export type Prediction = {
  kind: "ride_routine_weather" | "ride_routine_surge";
  // How urgent the nudge is — drives notification timing & UI emphasis.
  severity: "info" | "warning";
  title: string;
  message: string;
  // The routine this is about, so the UI can deep-link to booking it.
  drop: string;
  typicalHour: number;
  // Minutes before the typical booking time we suggest acting.
  leadMinutes: number;
};

// How close (in minutes) the routine's booking time must be for a heads-up to
// be worth showing now. Beyond this we stay quiet — no nagging hours ahead.
const HORIZON_MINUTES = 90;
// A routine needs at least this many trips to be trusted enough to predict on.
const MIN_TRIPS = 3;
// Suggested head-start when surge/rain is likely around the routine.
const EARLY_LEAVE_MINUTES = 15;

function minutesUntilHour(now: Date, hour: number): number {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

function hour12(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
}

// Derive proactive heads-ups from a profile + the current context. Returns the
// most relevant prediction first (we only ever surface the top one or two).
export function predictFor(
  profile: DecisionProfile,
  ctx: DecisionContext,
): Prediction[] {
  if (!profile.confident) return [];

  const out: Prediction[] = [];

  for (const routine of profile.routines.recurringRides) {
    if (routine.count < MIN_TRIPS || routine.typicalHour == null) continue;

    const untilBooking = minutesUntilHour(ctx.now, routine.typicalHour);
    // Only nudge as the routine's window approaches — not all day.
    if (untilBooking > HORIZON_MINUTES) continue;

    const wet =
      ctx.weather.condition === "rain" ||
      ctx.weather.condition === "heavy_rain" ||
      (ctx.weather.rainChance ?? 0) >= 0.5;

    if (wet) {
      // The rain example, generalised.
      out.push({
        kind: "ride_routine_weather",
        severity: ctx.weather.condition === "heavy_rain" ? "warning" : "info",
        title: "Rain around your usual ride",
        message:
          `Looks like rain near your ${hour12(routine.typicalHour)} ride to ${routine.drop}. ` +
          `Cabs get scarce and fares surge in the wet — book about ${EARLY_LEAVE_MINUTES} min early to beat it.`,
        drop: routine.drop,
        typicalHour: routine.typicalHour,
        leadMinutes: EARLY_LEAVE_MINUTES,
      });
    } else if (ctx.isPeakCommute && untilBooking <= HORIZON_MINUTES) {
      // No rain, but the routine sits in the commute peak → surge nudge.
      out.push({
        kind: "ride_routine_surge",
        severity: "info",
        title: "Beat the commute surge",
        message:
          `Your ${hour12(routine.typicalHour)} ride to ${routine.drop} falls in peak hours. ` +
          `Booking a few minutes early usually means a lower fare and a faster pickup.`,
        drop: routine.drop,
        typicalHour: routine.typicalHour,
        leadMinutes: EARLY_LEAVE_MINUTES,
      });
    }
  }

  // Most imminent routine first; warnings outrank info at equal urgency.
  return out
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "warning" ? -1 : 1;
      return (
        minutesUntilHour(ctx.now, a.typicalHour) -
        minutesUntilHour(ctx.now, b.typicalHour)
      );
    })
    .slice(0, 2);
}

// Convenience for routes: build the profile + context for a user and predict.
export async function predictForUser(
  userId: string,
  opts: { lat?: number | null; lng?: number | null; now?: Date } = {},
): Promise<Prediction[]> {
  const [profile, ctx] = await Promise.all([
    buildDecisionProfile(userId),
    buildContext(opts),
  ]);
  return predictFor(profile, ctx);
}
