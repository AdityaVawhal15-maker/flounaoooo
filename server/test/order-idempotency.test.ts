import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";

// A double-tap, or a connection that retried, sends the same booking twice.
// Before this, each one became its own order the customer could be charged
// for: three identical requests against the running app produced three orders.
//
// The key is the client's, never a hash of the body. Those answer different
// questions, and deduping on content silently refuses a second order somebody
// actually wanted — which is why ordering the same dish twice is checked here
// too.

const ride = {
  domain: "ride",
  provider: "rapido",
  productName: "Rapido Bike",
  pickup: "Gachibowli",
  drop: "Hitech City",
  pickupLat: 17.4401,
  pickupLng: 78.3489,
  dropLat: 17.4435,
  dropLng: 78.3772,
};

describe("repeated order requests", () => {
  it("returns the first order when one attempt is sent twice", async () => {
    const { agent } = await authedAgent();
    const key = `attempt-${Date.now()}`;

    const first = await agent
      .post("/api/orders")
      .set("Idempotency-Key", key)
      .send(ride)
      .expect(201);
    const second = await agent
      .post("/api/orders")
      .set("Idempotency-Key", key)
      .send(ride)
      .expect(200);

    expect(second.body.order.id).toBe(first.body.order.id);
    expect(second.body.deduplicated).toBe(true);
  });

  it("still books when the rider deliberately takes the same trip again", async () => {
    const { agent } = await authedAgent();
    const a = await agent
      .post("/api/orders")
      .set("Idempotency-Key", `one-${Date.now()}`)
      .send(ride)
      .expect(201);
    const b = await agent
      .post("/api/orders")
      .set("Idempotency-Key", `two-${Date.now()}`)
      .send(ride)
      .expect(201);

    expect(b.body.order.id).not.toBe(a.body.order.id);
  });

  it("does not merge orders when no key is sent", async () => {
    // Buying the same dish twice is ordinary, and is how the reorder and
    // habit features are fed. Nothing may quietly collapse those into one.
    const { agent } = await authedAgent();
    const dish = { domain: "food", dishId: "dum-biryani", platform: "ondc" };
    const a = await agent.post("/api/orders").send(dish).expect(201);
    const b = await agent.post("/api/orders").send(dish).expect(201);
    expect(b.body.order.id).not.toBe(a.body.order.id);
  });

  it("keeps one person's key from touching another's orders", async () => {
    const key = `shared-${Date.now()}`;
    const one = await authedAgent();
    const two = await authedAgent();

    const mine = await one.agent
      .post("/api/orders")
      .set("Idempotency-Key", key)
      .send(ride)
      .expect(201);
    // Same key, different account: must be a fresh order, never a peek at
    // somebody else's.
    const theirs = await two.agent
      .post("/api/orders")
      .set("Idempotency-Key", key)
      .send(ride)
      .expect(201);

    expect(theirs.body.order.id).not.toBe(mine.body.order.id);
  });
});
