import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// The group deal.
//
// The risk in a feature like this is not that it fails to fire — it is that it
// fires when it should not, and dresses an upsell as a saving. So most of these
// tests are about staying quiet: one person is not a group, a pack that does not
// feed everyone is not an answer, and a pack that costs more is never offered.

async function groupOf(n: number) {
  const host = await authedAgent();
  const created = await host.agent
    .post("/api/groups")
    .send({ platform: "ondc" })
    .expect(201);
  const cartId = created.body.id as string;
  const others = [];
  for (let i = 1; i < n; i++) {
    const friend = await authedAgent();
    await friend.agent.post("/api/groups/join").send({ code: created.body.code }).expect(200);
    others.push(friend);
  }
  return { host, others, cartId };
}

describe("group deal suggestion", () => {
  it("spots a table that all ordered the same thing and finds the pack", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }

    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    const s = res.body.suggestion;
    expect(s).not.toBeNull();
    expect(s.dishId).toBe("family-biryani-pack");
    expect(s.theme).toBe("biryani");
    expect(s.peopleAgreeing).toBe(4);
    expect(s.serves).toBeGreaterThanOrEqual(4);
    // The saving is a real difference between two real prices.
    expect(s.savingPaise).toBe(s.currentPaise - s.packPaise);
    expect(s.savingPaise).toBeGreaterThan(0);
    expect(s.includes.length).toBeGreaterThan(0);
    expect(s.replacesItemIds).toHaveLength(4);
  });

  it("says nothing when one person orders four of the same dish", async () => {
    const { host, cartId } = await groupOf(1);
    for (let i = 0; i < 4; i++) {
      await host.agent
        .post(`/api/groups/${cartId}/items`)
        .send({ dishId: "dum-biryani" })
        .expect(201);
    }
    // A person is not a group deciding anything, however much they order.
    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    expect(res.body.suggestion).toBeNull();
  });

  it("says nothing when everyone ordered something different", async () => {
    const { host, others, cartId } = await groupOf(3);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    await others[0]!.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "chicken-burger" })
      .expect(201);
    await others[1]!.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "quinoa-bowl" })
      .expect(201);

    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    expect(res.body.suggestion).toBeNull();
  });

  it("never offers a pack that would leave someone unfed", async () => {
    // Five people, and the biryani pack serves four. Ordering again later is
    // not a saving, so this must stay quiet.
    const { host, others, cartId } = await groupOf(5);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }
    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    expect(res.body.suggestion).toBeNull();
  });

  it("never offers a pack that costs more than what is in the cart", async () => {
    const { host, others, cartId } = await groupOf(2);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "masala-dosa" }).expect(201);
    await others[0]!.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);

    // Two dosas are cheaper than the platter, so there is nothing to say.
    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    expect(res.body.suggestion).toBeNull();
  });

  it("compares only what the pack replaces, not the whole cart", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }
    // Something unrelated. Counting it in "current" would inflate the saving.
    await host.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "quinoa-bowl" })
      .expect(201);

    const res = await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200);
    const s = res.body.suggestion;
    expect(s.replacesItemIds).toHaveLength(4); // the bowl stays out of it
    const cart = await host.agent.get(`/api/groups/${cartId}`).expect(200);
    expect(s.currentPaise).toBeLessThan(cart.body.totalPaise);
  });

  it("applies the deal by swapping the items for the pack", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }
    const before = await host.agent.get(`/api/groups/${cartId}`).expect(200);
    const suggestion = (await host.agent.get(`/api/groups/${cartId}/suggestion`).expect(200)).body
      .suggestion;

    const applied = await host.agent
      .post(`/api/groups/${cartId}/suggestion/apply`)
      .send({})
      .expect(200);

    expect(applied.body.applied).toBe(suggestion.savingPaise);
    expect(applied.body.cart.totalPaise).toBe(before.body.totalPaise - suggestion.savingPaise);
    const items = await prisma.groupCartItem.findMany({ where: { cartId } });
    expect(items).toHaveLength(1);
    expect(items[0]!.dishId).toBe("family-biryani-pack");

    // And it does not apply twice: the cart no longer justifies it.
    await host.agent.post(`/api/groups/${cartId}/suggestion/apply`).send({}).expect(409);
  });

  it("lets only the host apply it, since it deletes other people's choices", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }
    await others[0]!.agent
      .post(`/api/groups/${cartId}/suggestion/apply`)
      .send({})
      .expect(403);
    expect(await prisma.groupCartItem.count({ where: { cartId } })).toBe(4);
  });

  it("re-derives the deal at apply time rather than trusting a stale screen", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    for (const o of others) {
      await o.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "dum-biryani" }).expect(201);
    }
    // The group changes its mind while the host is looking at the card.
    await prisma.groupCartItem.deleteMany({ where: { cartId, userId: { not: undefined } } });
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "veg-thali" }).expect(201);

    await host.agent.post(`/api/groups/${cartId}/suggestion/apply`).send({}).expect(409);
  });

  it("is silent on a shared ride", async () => {
    const host = await authedAgent();
    const created = await host.agent
      .post("/api/groups")
      .send({
        domain: "ride",
        ride: {
          provider: "ondc",
          productName: "ONDC Cab",
          pickup: "Hitech City",
          drop: "Airport",
          pickupLat: 17.4401,
          pickupLng: 78.3489,
          dropLat: 17.2403,
          dropLng: 78.4294,
        },
      })
      .expect(201);
    const res = await host.agent
      .get(`/api/groups/${created.body.id}/suggestion`)
      .expect(200);
    expect(res.body.suggestion).toBeNull();
  });
});

describe("group naming and reminders", () => {
  it("lets the host name the group and nobody else", async () => {
    const { host, others, cartId } = await groupOf(2);
    const named = await host.agent
      .patch(`/api/groups/${cartId}`)
      .send({ name: "Biryani Group", emoji: "😋" })
      .expect(200);
    expect(named.body.name).toBe("Biryani Group");
    expect(named.body.emoji).toBe("😋");

    await others[0]!.agent
      .patch(`/api/groups/${cartId}`)
      .send({ name: "Hijacked" })
      .expect(403);
  });

  it("reminds only the members who have not ordered", async () => {
    const { host, others, cartId } = await groupOf(3);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "veg-thali" }).expect(201);
    await others[0]!.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "veg-thali" })
      .expect(201);

    // One friend has ordered, one has not, and the host is never reminded.
    const res = await host.agent.post(`/api/groups/${cartId}/remind`).send({}).expect(200);
    expect(res.body.reminded).toBe(1);

    await others[1]!.agent
      .post(`/api/groups/${cartId}/items`)
      .send({ dishId: "veg-thali" })
      .expect(201);
    const again = await host.agent.post(`/api/groups/${cartId}/remind`).send({}).expect(200);
    // Ordering is what stops the nudges, which is a better throttle than a
    // timer because it cannot be turned into a stream of notifications.
    expect(again.body.reminded).toBe(0);
  });

  it("lists a member who has joined but not yet ordered", async () => {
    const { host, cartId } = await groupOf(3);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "veg-thali" }).expect(201);

    const view = await host.agent.get(`/api/groups/${cartId}`).expect(200);
    expect(view.body.members).toHaveLength(3);
    const waiting = view.body.members.filter((m: { hasOrdered: boolean }) => !m.hasOrdered);
    expect(waiting).toHaveLength(2);
    expect(view.body.members.filter((m: { isHost: boolean }) => m.isHost)).toHaveLength(1);
  });

  it("splits across the people who ordered, not the empty seats", async () => {
    const { host, others, cartId } = await groupOf(4);
    await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "veg-thali" }).expect(201);
    const view = await others[0]!.agent.get(`/api/groups/${cartId}`).expect(200);
    // One person ordered, so one person owes it. Dividing by four would bill
    // three people who have not chosen anything.
    expect(view.body.equalSplitPaise).toBe(view.body.totalPaise);
  });
});
