import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Saved crews.
//
// The feature is convenience, so the risk it carries is being used to put
// somebody in a room they never agreed to. These tests lean on that: a crew can
// only be built out of people who joined a cart themselves, only its owner can
// touch it, and blocking still wins when the crew is reopened months later.

async function userId(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return u.id;
}

/** A finished-looking cart: host, one friend, an item each. */
async function sharedCart() {
  const host = await authedAgent();
  const friend = await authedAgent();
  const created = await host.agent
    .post("/api/groups")
    .send({ platform: "ondc" })
    .expect(201);
  const cartId = created.body.id as string;
  await friend.agent.post("/api/groups/join").send({ code: created.body.code }).expect(200);
  await host.agent.post(`/api/groups/${cartId}/items`).send({ dishId: "masala-dosa" }).expect(201);
  await friend.agent
    .post(`/api/groups/${cartId}/items`)
    .send({ dishId: "dum-biryani", qty: 2 })
    .expect(201);
  return { host, friend, cartId };
}

describe("saved crews", () => {
  it("saves the people from a cart and remembers what they ordered", async () => {
    const { host, cartId } = await sharedCart();

    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Friday biryani", emoji: "😋" })
      .expect(201);

    expect(saved.body.crew.name).toBe("Friday biryani");
    expect(saved.body.crew.emoji).toBe("😋");
    expect(saved.body.crew.members).toHaveLength(2);
    expect(saved.body.crew.members.some((m: { isYou: boolean }) => m.isYou)).toBe(true);
    // "The usual" is the point of saving it.
    expect(saved.body.crew.usual).toHaveLength(2);
    expect(saved.body.crew.usual.map((u: { name: string }) => u.name).sort()).toEqual([
      "Dum Biryani",
      "Masala Dosa",
    ]);
  });

  it("cannot be built out of a cart you were never in", async () => {
    const { cartId } = await sharedCart();
    const outsider = await authedAgent();

    // Otherwise a crew would be a way to collect strangers into a list and
    // then seat them in a cart they never joined.
    await outsider.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Not mine" })
      .expect(403);
  });

  it("belongs to its owner alone", async () => {
    const { host, friend, cartId } = await sharedCart();
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Mine" })
      .expect(201);
    const crewId = saved.body.crew.id;

    // A member of the cart is in the crew, but the crew is not theirs.
    await friend.agent.get(`/api/groups/crews/${crewId}`).expect(404);
    await friend.agent.patch(`/api/groups/crews/${crewId}`).send({ name: "Theirs" }).expect(404);
    await friend.agent.post(`/api/groups/crews/${crewId}/reopen`).send({}).expect(404);
    await friend.agent.delete(`/api/groups/crews/${crewId}`).expect(404);

    const theirs = await friend.agent.get("/api/groups/crews").expect(200);
    expect(theirs.body.crews).toHaveLength(0);
  });

  it("refuses two crews with the same name", async () => {
    const { host, cartId } = await sharedCart();
    await host.agent.post("/api/groups/crews").send({ cartId, name: "Biryani" }).expect(201);
    await host.agent.post("/api/groups/crews").send({ cartId, name: "Biryani" }).expect(409);
  });

  it("reopens with everyone already seated", async () => {
    const { host, friend, cartId } = await sharedCart();
    const friendId = await userId(friend.email);
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Reopen me", emoji: "🍛" })
      .expect(201);

    const reopened = await host.agent
      .post(`/api/groups/crews/${saved.body.crew.id}/reopen`)
      .send({})
      .expect(201);

    expect(reopened.body.invited).toBe(2);
    expect(reopened.body.readded).toBe(0); // not asked for
    expect(reopened.body.code).toHaveLength(6);

    // The friend is a member without having to tap a link again.
    const view = await friend.agent.get(`/api/groups/${reopened.body.cartId}`).expect(200);
    expect(view.body.id).toBe(reopened.body.cartId);
    const members = await prisma.groupCartMember.findMany({
      where: { cartId: reopened.body.cartId },
      select: { userId: true },
    });
    expect(members.map((m) => m.userId)).toContain(friendId);
    // And the cart carries the crew's name, as the design shows it.
    const cart = await prisma.groupCart.findUniqueOrThrow({
      where: { id: reopened.body.cartId },
    });
    expect(cart.name).toBe("Reopen me");
    expect(cart.emoji).toBe("🍛");
  });

  it("re-adds the usual at today's price, never the saved one", async () => {
    const { host, cartId } = await sharedCart();
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Usual", emoji: "🍽" })
      .expect(201);

    // Rewrite history: the old cart claims the dosa cost a rupee.
    await prisma.groupCartItem.updateMany({
      where: { cartId, dishId: "masala-dosa" },
      data: { pricePaise: 100 },
    });

    const reopened = await host.agent
      .post(`/api/groups/crews/${saved.body.crew.id}/reopen`)
      .send({ withUsual: true })
      .expect(201);
    expect(reopened.body.readded).toBe(2);

    const items = await prisma.groupCartItem.findMany({
      where: { cartId: reopened.body.cartId },
    });
    const dosa = items.find((i) => i.dishId === "masala-dosa");
    expect(dosa?.pricePaise).toBe(12900); // catalogue price, not the doctored one
    // Quantities are part of "the usual" and do carry over.
    expect(items.find((i) => i.dishId === "dum-biryani")?.qty).toBe(2);
  });

  it("drops an item that is no longer sold and says how many", async () => {
    const { host, cartId } = await sharedCart();
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Delisted" })
      .expect(201);

    // A dish that is not in the catalogue any more.
    await prisma.groupCartItem.updateMany({
      where: { cartId, dishId: "masala-dosa" },
      data: { dishId: "dish-that-no-longer-exists" },
    });

    const reopened = await host.agent
      .post(`/api/groups/crews/${saved.body.crew.id}/reopen`)
      .send({ withUsual: true })
      .expect(201);

    // Silently shrinking the order would be the wrong kind of quiet.
    expect(reopened.body.readded).toBe(1);
    expect(reopened.body.unavailable).toBe(1);
  });

  it("leaves out someone who has been blocked since last time", async () => {
    const { host, friend, cartId } = await sharedCart();
    const friendId = await userId(friend.email);
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Fell out" })
      .expect(201);

    await host.agent.post("/api/users/blocked").send({ email: friend.email }).expect(201);

    const reopened = await host.agent
      .post(`/api/groups/crews/${saved.body.crew.id}/reopen`)
      .send({ withUsual: true })
      .expect(201);

    expect(reopened.body.invited).toBe(1);
    expect(reopened.body.excluded).toBe(1);
    const members = await prisma.groupCartMember.findMany({
      where: { cartId: reopened.body.cartId },
      select: { userId: true },
    });
    expect(members.map((m) => m.userId)).not.toContain(friendId);
    // Their old order does not come back either.
    const items = await prisma.groupCartItem.findMany({
      where: { cartId: reopened.body.cartId, userId: friendId },
    });
    expect(items).toHaveLength(0);
    // And they cannot read the new cart.
    await friend.agent.get(`/api/groups/${reopened.body.cartId}`).expect(403);
  });

  it("leaves out someone who blocked the host, not just the other way round", async () => {
    const { host, friend, cartId } = await sharedCart();
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "They left" })
      .expect(201);

    // The friend blocks the host. Reopening must respect that too.
    await friend.agent.post("/api/users/blocked").send({ email: host.email }).expect(201);

    const reopened = await host.agent
      .post(`/api/groups/crews/${saved.body.crew.id}/reopen`)
      .send({})
      .expect(201);
    expect(reopened.body.invited).toBe(1);
    expect(reopened.body.excluded).toBe(1);
  });

  it("renames, drops a member, and deletes", async () => {
    const { host, friend, cartId } = await sharedCart();
    const friendId = await userId(friend.email);
    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Before" })
      .expect(201);
    const crewId = saved.body.crew.id;

    const renamed = await host.agent
      .patch(`/api/groups/crews/${crewId}`)
      .send({ name: "After", emoji: "🔥" })
      .expect(200);
    expect(renamed.body.crew.name).toBe("After");
    expect(renamed.body.crew.emoji).toBe("🔥");

    // Removing yourself from your own crew makes no sense and is refused
    // rather than quietly producing an ownerless crew.
    const hostId = await userId(host.email);
    await host.agent.delete(`/api/groups/crews/${crewId}/members/${hostId}`).expect(400);

    const dropped = await host.agent
      .delete(`/api/groups/crews/${crewId}/members/${friendId}`)
      .expect(200);
    expect(dropped.body.crew.members).toHaveLength(1);

    await host.agent.delete(`/api/groups/crews/${crewId}`).expect(200);
    await host.agent.get(`/api/groups/crews/${crewId}`).expect(404);
  });

  it("will not reopen a shared ride, because a trip is a moment", async () => {
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

    const saved = await host.agent
      .post("/api/groups/crews")
      .send({ cartId: created.body.id, name: "Office cab" })
      .expect(201);
    // The people are still worth keeping; the trip is not.
    expect(saved.body.crew.domain).toBe("ride");
    await host.agent.post(`/api/groups/crews/${saved.body.crew.id}/reopen`).send({}).expect(400);
  });

  it("refuses fields it does not know", async () => {
    const { host, cartId } = await sharedCart();
    await host.agent
      .post("/api/groups/crews")
      .send({ cartId, name: "Strict", ownerId: "someone-else" })
      .expect(400);
  });
});
