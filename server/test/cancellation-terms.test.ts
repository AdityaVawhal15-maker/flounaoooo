// The published cancellation and refund terms.
//
// Refund policy 2.3 promises a five minute window after payment in which a
// cancellation is free, full and unquestioned. A promise this specific is worth
// testing at its edges, because every way of getting it slightly wrong takes
// something from the customer that they were told they had.

import { describe, it, expect } from "vitest";
import {
  cancellationTerms,
  refundWindowDays,
} from "../src/modules/orders/cancellation.service.js";
import { FREE_CANCEL_WINDOW_MS } from "../src/lib/policy.js";

const order = (status = "confirmed") => ({
  status,
  domain: "food",
  createdAt: new Date("2026-08-31T10:00:00Z"),
});

const paid = (at: string, method: string | null = "upi") => ({
  status: "success",
  method,
  createdAt: new Date(at),
});

describe("the free cancellation window", () => {
  it("is open immediately after payment", () => {
    const t = cancellationTerms(
      order(),
      paid("2026-08-31T10:00:00Z"),
      new Date("2026-08-31T10:00:01Z"),
    );
    expect(t.freeWindow).toBe(true);
    expect(t.cancellable).toBe(true);
    expect(t.summary).toMatch(/no questions asked/);
  });

  it("is still open at four minutes fifty nine seconds", () => {
    const t = cancellationTerms(
      order(),
      paid("2026-08-31T10:00:00Z"),
      new Date("2026-08-31T10:04:59Z"),
    );
    expect(t.freeWindow).toBe(true);
    expect(t.windowRemainingMs).toBeGreaterThan(0);
  });

  it("has closed at five minutes exactly", () => {
    // The boundary is the whole point of a published number. Off by one here
    // means somebody is refused a refund they were promised, or given one the
    // seller never agreed to.
    const t = cancellationTerms(
      order(),
      paid("2026-08-31T10:00:00Z"),
      new Date(new Date("2026-08-31T10:00:00Z").getTime() + FREE_CANCEL_WINDOW_MS),
    );
    expect(t.freeWindow).toBe(false);
    expect(t.windowRemainingMs).toBe(0);
    // And does not promise a full refund it cannot deliver.
    expect(t.summary).toMatch(/seller/i);
    expect(t.summary).not.toMatch(/in full/);
  });

  it("is still cancellable after the window, just not free", () => {
    const t = cancellationTerms(
      order(),
      paid("2026-08-31T10:00:00Z"),
      new Date("2026-08-31T11:00:00Z"),
    );
    expect(t.cancellable).toBe(true);
    expect(t.freeWindow).toBe(false);
  });

  it("runs from payment, not from when the order was created", () => {
    // Someone who left checkout open for half an hour before paying still gets
    // their five minutes. Measuring from creation would silently take it away.
    const t = cancellationTerms(
      { status: "confirmed", domain: "food", createdAt: new Date("2026-08-31T09:00:00Z") },
      paid("2026-08-31T10:00:00Z"),
      new Date("2026-08-31T10:02:00Z"),
    );
    expect(t.freeWindow).toBe(true);
  });
});

describe("orders with nothing charged", () => {
  it("costs nothing to cancel and says so", () => {
    const t = cancellationTerms(order("pending_payment"), null);
    expect(t.cancellable).toBe(true);
    expect(t.unpaid).toBe(true);
    expect(t.summary).toMatch(/nothing has been charged/i);
  });

  it("treats a pending payment as unpaid", () => {
    // Cash on delivery sits at pending. There is no money to give back, and
    // promising a refund for it would be nonsense.
    const t = cancellationTerms(order(), {
      status: "pending",
      method: null,
      createdAt: new Date(),
    });
    expect(t.unpaid).toBe(true);
  });
});

describe("orders that are already finished", () => {
  it("cannot be cancelled once complete or already cancelled", () => {
    expect(cancellationTerms(order("completed"), paid("2026-08-31T10:00:00Z")).cancellable).toBe(false);
    expect(cancellationTerms(order("cancelled"), paid("2026-08-31T10:00:00Z")).cancellable).toBe(false);
  });
});

describe("refund timelines match the published table", () => {
  it("uses the range for the method that was actually used", () => {
    expect(refundWindowDays("upi")).toEqual([1, 2]);
    expect(refundWindowDays("card")).toEqual([3, 5]);
    expect(refundWindowDays("netbanking")).toEqual([5, 7]);
    expect(refundWindowDays("wallet")).toEqual([1, 2]);
  });

  it("falls back to the widest range, never the narrowest", () => {
    // Quoting 1 to 2 days for an unknown method and taking seven is a broken
    // promise. Quoting 5 to 7 and taking two is a pleasant surprise.
    expect(refundWindowDays(null)).toEqual([5, 7]);
    expect(refundWindowDays("something-new")).toEqual([5, 7]);
  });
});
