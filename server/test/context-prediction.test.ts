import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authedAgent } from "./helpers.js";
import {
  buildContext,
  timeOfDayFor,
} from "../src/modules/advisor/context.service.js";
import { predictFor } from "../src/modules/advisor/prediction.service.js";
import type { DecisionProfile } from "../src/modules/advisor/decisionProfile.service.js";
import type { DecisionContext } from "../src/modules/advisor/context.service.js";

// A 9am date in a monsoon month (July) so offline weather is wet in the evening
// but cloudy in the morning — deterministic, no network.
function at(hour: number, month = 6 /* July */): Date {
  const d = new Date(2026, month, 15, hour, 0, 0, 0);
  return d;
}

describe("context engine (Faculty 3)", () => {
  it("buckets the time of day", () => {
    expect(timeOfDayFor(6)).toBe("early_morning");
    expect(timeOfDayFor(9)).toBe("morning");
    expect(timeOfDayFor(13)).toBe("midday");
    expect(timeOfDayFor(18)).toBe("evening");
    expect(timeOfDayFor(22)).toBe("night");
    expect(timeOfDayFor(2)).toBe("late_night");
  });

  it("flags peak commute and meal windows", async () => {
    const morning = await buildContext({ now: at(9), skipWeather: true });
    expect(morning.isPeakCommute).toBe(true);
    expect(morning.timeOfDay).toBe("morning");

    const lunch = await buildContext({ now: at(13), skipWeather: true });
    expect(lunch.isMealWindow).toBe(true);
    expect(lunch.isPeakCommute).toBe(false);
  });

  it("offline weather is deterministic and wet on monsoon evenings", async () => {
    const evening = await buildContext({ now: at(18), skipWeather: true });
    expect(evening.weather.source).toBe("offline");
    expect(["rain", "heavy_rain"]).toContain(evening.weather.condition);
    expect(evening.rideDemandLikely).toBe(true);

    // A dry-season midday is clear and calm.
    const dry = await buildContext({ now: at(13, 1 /* Feb */), skipWeather: true });
    expect(dry.weather.condition).toBe("clear");
  });
});

// Build a confident profile with one recurring morning ride routine.
function profileWithRoutine(
  hour: number,
  count = 4,
): DecisionProfile {
  return {
    orders: count,
    confident: true,
    taste: { topDishes: [], dietary: "unknown" },
    spend: { avgOrderPaise: 20000, band: "mid", offerSensitive: false },
    routines: {
      recurringRides: [{ drop: "Office", count, typicalHour: hour }],
      reorderHabits: [],
    },
  };
}

function ctx(now: Date, wet: boolean): DecisionContext {
  return {
    now,
    hour: now.getHours(),
    timeOfDay: timeOfDayFor(now.getHours()),
    isPeakCommute: (now.getHours() >= 8 && now.getHours() < 11) ||
      (now.getHours() >= 17 && now.getHours() < 21),
    isMealWindow: false,
    weather: wet
      ? { condition: "rain", temperatureC: 26, rainChance: 0.7, source: "offline" }
      : { condition: "clear", temperatureC: 31, rainChance: 0.05, source: "offline" },
    rideDemandLikely: wet,
  };
}

describe("proactive prediction (Faculty 4)", () => {
  it("fires a rain heads-up before the user's usual ride", () => {
    // Routine at 9am; it's 8:20am and raining → predict.
    const profile = profileWithRoutine(9);
    const preds = predictFor(profile, ctx(at(8), true));
    expect(preds.length).toBe(1);
    expect(preds[0]!.kind).toBe("ride_routine_weather");
    expect(preds[0]!.drop).toBe("Office");
    expect(preds[0]!.leadMinutes).toBeGreaterThan(0);
    expect(preds[0]!.message.toLowerCase()).toContain("rain");
  });

  it("stays quiet when the routine is hours away", () => {
    // Routine at 9am but it's only 5am → outside the horizon, no nag.
    const profile = profileWithRoutine(9);
    const preds = predictFor(profile, ctx(at(5), true));
    expect(preds).toEqual([]);
  });

  it("nudges about surge at peak even without rain", () => {
    const profile = profileWithRoutine(9);
    const preds = predictFor(profile, ctx(at(8), false));
    expect(preds.length).toBe(1);
    expect(preds[0]!.kind).toBe("ride_routine_surge");
  });

  it("does not predict for a non-confident (new) user", () => {
    const profile = profileWithRoutine(9, 1);
    profile.confident = false;
    expect(predictFor(profile, ctx(at(8), true))).toEqual([]);
  });

  it("ignores routines with too few trips", () => {
    const profile = profileWithRoutine(9, 2); // < MIN_TRIPS (3)
    expect(predictFor(profile, ctx(at(8), true))).toEqual([]);
  });
});

describe("predictions endpoint", () => {
  it("returns a predictions list for a logged-in user", async () => {
    const { agent } = await authedAgent();
    const res = await agent.get("/api/users/predictions").expect(200);
    // A brand-new user has no routines yet → empty but well-formed.
    expect(Array.isArray(res.body.predictions)).toBe(true);
    expect(res.body.predictions).toEqual([]);
  });

  it("requires authentication", async () => {
    await request(app).get("/api/users/predictions").expect(401);
  });
});
