import { describe, expect, it } from "vitest";
import { adviseFood, adviseRide } from "../src/modules/advisor/advisor.service.js";

function at(hour: number, minute = 0): Date {
  const d = new Date("2026-06-15T00:00:00");
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe("food advisor", () => {
  it("says order now inside an offer window", () => {
    const advice = adviseFood(at(13)); // lunch window 12–15
    expect(advice.action).toBe("order_now");
    expect(advice.message).toContain("lunch-hour deal");
  });

  it("suggests waiting when a big offer starts soon", () => {
    const advice = adviseFood(at(19)); // dinner offer at 20:00
    expect(advice.action).toBe("wait");
    expect(advice.expectedSavingPaise).toBe(10000);
    expect(advice.waitMinutes).toBe(60);
    expect(advice.message).toContain("₹100");
  });

  it("does not suggest absurdly long waits", () => {
    const advice = adviseFood(at(2)); // next window is 10h away
    expect(advice.action).toBe("order_now");
  });
});

describe("ride advisor", () => {
  it("flags off-peak as the best time to book", () => {
    const advice = adviseRide(at(14));
    expect(advice.action).toBe("order_now");
    expect(advice.message).toContain("Off-peak");
  });

  it("suggests a short wait near the end of surge", () => {
    const advice = adviseRide(at(20, 30)); // evening surge ends 21:00
    expect(advice.action).toBe("wait");
    expect(advice.waitMinutes).toBe(30);
  });

  it("is honest mid-surge when waiting won't help soon", () => {
    const advice = adviseRide(at(17, 30)); // 3.5h of surge left
    expect(advice.action).toBe("order_now");
    expect(advice.message).toContain("peak");
  });
});
