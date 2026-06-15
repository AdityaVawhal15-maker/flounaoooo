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

    // Host checks out → creates one combined order
    const checkout = await host.agent.post(`/api/groups/${id}/checkout`).expect(200);
    const orderRes = await host.agent.get(`/api/orders/${checkout.body.orderId}`).expect(200);
    expect(orderRes.body.order.amount).toBe(35800);
    expect(orderRes.body.order.details.group).toBe(true);
    expect(orderRes.body.order.details.memberCount).toBe(2);
  });

  it("prices items server-side, ignoring client-sent price", async () => {
    const { agent } = await authedAgent();
    const cart = await agent.post("/api/groups").send({ platform: "ondc" }).expect(201);
    const res = await agent
      .post(`/api/groups/${cart.body.id}/items`)
      .send({ dishId: "masala-dosa", pricePaise: 1 })
      .expect(201);
    expect(res.body.totalPaise).toBe(12900); // not 1
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
