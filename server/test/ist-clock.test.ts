import { describe, expect, it } from "vitest";
import { istHour, istWeekday, istStartOfWeek, istStartOfDay } from "../src/lib/istTime.js";
import { startOfWeek } from "../src/modules/users/budget.service.js";

// The whole point of this file is the case a developer's machine cannot show
// them: a host running UTC, which is what a VPS does by default. Every time
// here is built from a fixed instant, so the answers must not depend on where
// the test is run.

describe("the Indian clock", () => {
  it("reads the hour a person in India would see, not the host's", () => {
    // 14:30 UTC is half past eight in the evening in India.
    const at = new Date("2026-08-31T14:30:00Z");
    expect(istHour(at)).toBe(20);
  });

  it("keeps late evening on the right day", () => {
    // 20:00 UTC Sunday is already 01:30 Monday in India.
    const at = new Date("2026-08-30T20:00:00Z"); // a Sunday
    expect(istWeekday(at)).toBe(1); // Monday
  });

  it("counts a Monday-morning order against this week, not last", () => {
    // 01:00 IST Monday = 19:30 UTC Sunday. Read as the host's Sunday, this
    // order would have been charged to the week that just ended.
    const mondayEarly = new Date("2026-08-30T19:30:00Z");
    const week = startOfWeek(mondayEarly);
    // The week must start on the Monday that has just begun in India.
    expect(istWeekday(week)).toBe(1);
    expect(week.getTime()).toBeLessThanOrEqual(mondayEarly.getTime());
    expect(mondayEarly.getTime() - week.getTime()).toBeLessThan(24 * 3600_000);
  });

  it("puts the week boundary at midnight in India", () => {
    const w = istStartOfWeek(new Date("2026-09-03T09:00:00Z"));
    expect(istHour(w)).toBe(0);
    expect(istWeekday(w)).toBe(1);
  });

  it("starts the day at midnight in India", () => {
    const d = istStartOfDay(new Date("2026-08-31T14:30:00Z"));
    expect(istHour(d)).toBe(0);
    // 00:00 IST is 18:30 UTC the day before.
    expect(d.toISOString()).toBe("2026-08-30T18:30:00.000Z");
  });
});
