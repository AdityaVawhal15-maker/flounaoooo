import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";

describe("group ordering", () => {
  it("runs a full host + member flow with equal split", async () => {
    const host = await authedAgent();
    const friend = await authedAgent();

    // Host creates a group cart
    const created = await host.agent
      .post("/api/groups")
      .send({ platform: "ondc" })
      .expect(201);
    const { id, code } = created.body;
    expect(code).toHaveLength(6);
    expect(created.body.isHost).toBe(true);

    // Friend joins by code
    const joined = await friend.agent
      .post("/api/groups/join")
      .send({ code })
      .expect(200);
    expect(joined.body.id).toBe(id);
    expect(joined.body.isHost).toBe(false);

    // Each adds an item (ONDC prices: masala dosa ₹129, dum biryani ₹229)
    await host.agent.post(`/api/groups/${id}/items`).send({ dishId: "masala-dosa" }).expect(201);
    const afterFriend = await friend.agent
      .post(`/api/groups/${id}/items`)
      .send({ dishId: "dum-biryani" })
      .expect(201);

    // Total ₹358 across 2 members → ₹179 each
    expect(afterFriend.body.totalPaise).toBe(12900 + 22900);
    expect(afterFriend.body.equalSplitPaise).toBe(Math.round((12900 + 22900) / 2));
    expect(afterFriend.body.members).toHaveLength(2);

    // Host checks out with their UPI → combined order + per-member shares.
    const checkout = await host.agent
      .post(`/api/groups/${id}/checkout`)
      .send({ hostUpiId: "host@okhdfcbank" })
      .expect(200);
    expect(checkout.body.totalPaise).toBe(35800);
    // Shares are by what each member ordered, not a flat split.
    const friendShare = checkout.body.shares.find((s: { isHost: boolean }) => !s.isHost);
    const hostShare = checkout.body.shares.find((s: { isHost: boolean }) => s.isHost);
    expect(friendShare.sharePaise).toBe(22900); // friend's dum biryani
    expect(hostShare.sharePaise).toBe(12900); // host's masala dosa
    expect(friendShare.upiLink).toContain("upi://pay");
    expect(friendShare.upiLink).toContain("host%40okhdfcbank");
    expect(hostShare.upiLink).toBeNull(); // host doesn't pay themselves

    const orderRes = await host.agent.get(`/api/orders/${checkout.body.orderId}`).expect(200);
    expect(orderRes.body.order.amount).toBe(35800);
    expect(orderRes.body.order.details.group).toBe(true);
    expect(orderRes.body.order.details.memberCount).toBe(2);
  });

  it("rejects an invalid host UPI ID at checkout", async () => {
    const { agent } = await authedAgent();
    const cart = await agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    await agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);
    await agent
      .post(`/api/groups/${cart.body.id}/checkout`)
      .send({ hostUpiId: "not a upi" })
      .expect(400);
  });

  it("refuses a request that tries to name its own price", async () => {
    const { agent } = await authedAgent();
    const cart = await agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    // This used to answer 201 and quietly drop the price. The item was always
    // priced from the catalogue, so nothing was ever mispriced — but a 201 tells
    // whoever is probing that the field was understood, and the whole request is
    // now refused instead.
    await agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa", pricePaise: 1 })
      .expect(400);

    const after = await agent.get(`/api/groups/${cart.body.id}`).expect(200);
    expect(after.body.totalPaise).toBe(0); // nothing was added
  });

  it("prices a legitimate item from the catalogue", async () => {
    const { agent } = await authedAgent();
    const cart = await agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    const res = await agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);
    expect(res.body.totalPaise).toBe(12900);
  });

  it("only the host can check out", async () => {
    const host = await authedAgent();
    const friend = await authedAgent();
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    await friend.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
    await friend.agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);
    await friend.agent.post(`/api/groups/${cart.body.id}/checkout`).expect(403);
  });

  it("rejects an empty checkout and bad join codes", async () => {
    const { agent } = await authedAgent();
    const cart = await agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    await agent.post(`/api/groups/${cart.body.id}/checkout`).expect(400);
    await agent.post("/api/groups/join").send({ code: "ZZZZZZ" }).expect(404);
  });

  it("blocks a non-member from reading a cart by ID (H1)", async () => {
    const host = await authedAgent();
    const stranger = await authedAgent();
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    // Stranger knows the ID but never joined → must be denied.
    await stranger.agent.get(`/api/groups/${cart.body.id}`).expect(403);
    // Host can read their own cart.
    await host.agent.get(`/api/groups/${cart.body.id}`).expect(200);
  });

  it("blocks a non-member from adding items by ID (H2)", async () => {
    const host = await authedAgent();
    const stranger = await authedAgent();
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    await stranger.agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(403);
  });

  it("lets a member read and add after joining via code", async () => {
    const host = await authedAgent();
    const friend = await authedAgent();
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    // Join establishes membership, then read + add both succeed.
    await friend.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
    await friend.agent.get(`/api/groups/${cart.body.id}`).expect(200);
    await friend.agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);
  });

  it("lets a member remove only their own item", async () => {
    const host = await authedAgent();
    const friend = await authedAgent();
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    const id = cart.body.id;
    await friend.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
    const hostAdd = await host.agent
      .post(`/api/groups/${id}/items`)
      .send({ dishId: "masala-dosa" })
      .expect(201);
    const hostItemId = hostAdd.body.items[0].id;
    // Friend adds their own item so they're a participating member
    await friend.agent
      .post(`/api/groups/${id}/items`)
      .send({ dishId: "dum-biryani" })
      .expect(201);

    // Friend can't delete the host's item (not theirs)
    await friend.agent.delete(`/api/groups/${id}/items/${hostItemId}`).expect(404);
    // Host can
    await host.agent.delete(`/api/groups/${id}/items/${hostItemId}`).expect(200);
  });
});

// Privacy & Security settings are only real if they change what happens here —
// the one screen that puts two accounts in the same room.
describe("group ordering honours privacy settings", () => {
  it("a blocked user cannot join the blocker's cart, in either direction", async () => {
    const host = await authedAgent();
    const blocked = await authedAgent();

    await host.agent
      .post("/api/users/blocked")
      .send({ email: blocked.email })
      .expect(201);

    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    // Same answer a closed cart gives, so this can't be used to detect a block.
    await blocked.agent
      .post("/api/groups/join")
      .send({ code: cart.body.code })
      .expect(409);

    // And the reverse: someone who did the blocking isn't put back in a room
    // with the person they blocked.
    const theirCart = await blocked.agent
      .post("/api/groups")
      .send({ platform: "ondc" })
      .expect(201);
    await host.agent
      .post("/api/groups/join")
      .send({ code: theirCart.body.code })
      .expect(409);
  });

  it("unblocking lets them join again", async () => {
    const host = await authedAgent();
    const other = await authedAgent();
    const block = await host.agent
      .post("/api/users/blocked")
      .send({ email: other.email })
      .expect(201);
    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    await other.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(409);

    await host.agent.delete(`/api/users/blocked/${block.body.blocked.id}`).expect(200);
    await other.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
  });

  it("profileVisibility 'nobody' hides a member's name from others but not themselves", async () => {
    const host = await authedAgent();
    const shy = await authedAgent();

    await shy.agent
      .put("/api/users/preferences")
      .send({ profileVisibility: "nobody" })
      .expect(200);

    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    const id = cart.body.id;
    await shy.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
    await shy.agent.post(`/api/groups/${id}/items`).send({ dishId: "dum-biryani" }).expect(201);

    const hostView = await host.agent.get(`/api/groups/${id}`).expect(200);
    const asSeenByHost = hostView.body.members.find(
      (m: { isYou: boolean }) => !m.isYou,
    );
    expect(asSeenByHost.name).toBe("Flouna user");

    // The member still sees their own real name.
    const ownView = await shy.agent.get(`/api/groups/${id}`).expect(200);
    const asSeenBySelf = ownView.body.members.find((m: { isYou: boolean }) => m.isYou);
    expect(asSeenBySelf.name).not.toBe("Flouna user");
  });

  it("activityStatus off means other members are never told you are active", async () => {
    const host = await authedAgent();
    const quiet = await authedAgent();

    await quiet.agent
      .put("/api/users/preferences")
      .send({ activityStatus: false })
      .expect(200);

    const cart = await host.agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    const id = cart.body.id;
    await quiet.agent.post("/api/groups/join").send({ code: cart.body.code }).expect(200);
    await quiet.agent.post(`/api/groups/${id}/items`).send({ dishId: "dum-biryani" }).expect(201);

    const hostView = await host.agent.get(`/api/groups/${id}`).expect(200);
    const them = hostView.body.members.find((m: { isYou: boolean }) => !m.isYou);
    expect(them.active).toBe(false);
  });
});
