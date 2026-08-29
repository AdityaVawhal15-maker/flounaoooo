import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Encrypted group chat on Sender Keys, tested as the transport it is.
//
// The server cannot verify any of the cryptography — to it a distribution
// message is an opaque string — so these check what it CAN get wrong, which is
// every way it might hand the wrong bytes to the wrong person or let one
// member speak as another: reading somebody else's chain, publishing under a
// device you do not own, re-sealing a chain after the fact, replaying a chain
// position, and handing a stranger a "history" of the conversation.

const KEY_A = Buffer.from("a".repeat(64)).toString("base64");
const KEY_B = Buffer.from("b".repeat(64)).toString("base64");
const SIG_A = Buffer.from("s".repeat(64)).toString("base64");
const IV = Buffer.from("0123456789ab").toString("base64");

const DEV_HOST = "host-device-00001";
const DEV_HOST_2 = "host-device-00002";
const DEV_FRIEND = "friend-device-0001";

async function userId(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return u.id;
}

/** Two people in one cart, which is the precondition for everything here. */
async function cartWithMember() {
  const host = await authedAgent();
  const friend = await authedAgent();
  const created = await host.agent
    .post("/api/groups")
    .send({ platform: "ondc" })
    .expect(201);
  await friend.agent.post("/api/groups/join").send({ code: created.body.code }).expect(200);
  return { host, friend, cartId: created.body.id as string };
}

function register(
  agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
  cartId: string,
  deviceId: string,
  publicKey = KEY_A,
) {
  return agent
    .post(`/api/groups/${cartId}/chat/devices`)
    .send({ deviceId, publicKey, signingKey: SIG_A });
}

describe("encrypted group chat — devices", () => {
  it("registers a device's sealing and signing keys and shows them to members", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    const keys = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST}`)
      .expect(200);
    expect(keys.body.devices).toHaveLength(2);
    // Public keys are public — a member must be able to seal to the others.
    expect(keys.body.devices.map((d: { deviceId: string }) => d.deviceId).sort()).toEqual(
      [DEV_FRIEND, DEV_HOST].sort(),
    );
    expect(keys.body.devices[0].signingKey).toBe(SIG_A);
    // Nobody has been handed this device's chain yet, so it owes everyone.
    expect(keys.body.owed).toHaveLength(2);
    expect(keys.body.inbound).toEqual([]);
  });

  it("drops the chains sealed to a device whose key changed", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const friendId = await userId(friend.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    await host.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        senderDevice: DEV_HOST,
        envelopes: [
          { recipientId: friendId, recipientDevice: DEV_FRIEND, senderKey: KEY_A, iv: IV, payload: KEY_A },
        ],
      })
      .expect(201);
    expect(await prisma.senderKeyEnvelope.count({ where: { cartId } })).toBe(1);

    // Clearing site data makes a new key. The old envelopes are sealed to a
    // private key that no longer exists, so keeping them would leave the device
    // holding post it can never open and blaming the network.
    const again = await register(friend.agent, cartId, DEV_FRIEND, KEY_A).expect(201);
    expect(again.body.rekeyed).toBe(true);
    expect(await prisma.senderKeyEnvelope.count({ where: { cartId } })).toBe(0);
  });

  it("does not treat a re-registration with the same key as a rekey", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    const again = await register(host.agent, cartId, DEV_HOST).expect(201);
    expect(again.body.rekeyed).toBe(false);
  });
});

describe("encrypted group chat — chains", () => {
  it("gives each device only the chains addressed to it", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const hostId = await userId(host.email);
    const friendId = await userId(friend.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(host.agent, cartId, DEV_HOST_2).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    await friend.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        senderDevice: DEV_FRIEND,
        envelopes: [
          { recipientId: hostId, recipientDevice: DEV_HOST, senderKey: KEY_B, iv: IV, payload: KEY_A },
          { recipientId: hostId, recipientDevice: DEV_HOST_2, senderKey: KEY_B, iv: IV, payload: KEY_B },
        ],
      })
      .expect(201);

    // The host's first device gets exactly one chain, sealed for it. Its own
    // sibling's envelope is a different ciphertext and must not be handed over
    // — sealed material for another device is what an attacker collects.
    const first = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST}`)
      .expect(200);
    expect(first.body.inbound).toHaveLength(1);
    expect(first.body.inbound[0].payload).toBe(KEY_A);

    const second = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST_2}`)
      .expect(200);
    expect(second.body.inbound).toHaveLength(1);
    expect(second.body.inbound[0].payload).toBe(KEY_B);
  });

  it("refuses to publish a chain under a device you do not own", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const hostId = await userId(host.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    // Recipients key their chain state by device id, so publishing under
    // someone else's id would let a member take over that device's chain as
    // far as every recipient is concerned.
    await friend.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        senderDevice: DEV_HOST,
        envelopes: [
          { recipientId: hostId, recipientDevice: DEV_HOST, senderKey: KEY_B, iv: IV, payload: KEY_B },
        ],
      })
      .expect(403);
    expect(await prisma.senderKeyEnvelope.count({ where: { cartId } })).toBe(0);
  });

  it("refuses to read another device's inbox even within one account", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);
    // The host asking as the friend's device.
    await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_FRIEND}`)
      .expect(403);
  });

  it("never replaces a chain that has already been published", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const friendId = await userId(friend.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    const publish = (payload: string) =>
      host.agent.post(`/api/groups/${cartId}/chat/keys`).send({
        senderDevice: DEV_HOST,
        envelopes: [
          { recipientId: friendId, recipientDevice: DEV_FRIEND, senderKey: KEY_A, iv: IV, payload },
        ],
      });

    expect((await publish(KEY_A).expect(201)).body.written).toBe(1);
    // Without first-writer-wins, a member could re-seal a chain around a value
    // of their own choosing after the fact and fork the conversation onto it.
    expect((await publish(KEY_B).expect(201)).body.written).toBe(0);

    const got = await friend.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_FRIEND}`)
      .expect(200);
    expect(got.body.inbound[0].payload).toBe(KEY_A);
  });

  it("ignores a chain addressed to somebody outside the cart", async () => {
    const { host, cartId } = await cartWithMember();
    const outsider = await authedAgent();
    const outsiderId = await userId(outsider.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);

    const res = await host.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        senderDevice: DEV_HOST,
        envelopes: [
          { recipientId: outsiderId, recipientDevice: "outsider-device001", senderKey: KEY_A, iv: IV, payload: KEY_A },
        ],
      })
      .expect(201);
    expect(res.body.written).toBe(0);
  });

  it("stops owing a chain to a device once it has been published", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const hostId = await userId(host.email);
    const friendId = await userId(friend.email);
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    await host.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        senderDevice: DEV_HOST,
        envelopes: [
          { recipientId: hostId, recipientDevice: DEV_HOST, senderKey: KEY_A, iv: IV, payload: KEY_A },
          { recipientId: friendId, recipientDevice: DEV_FRIEND, senderKey: KEY_A, iv: IV, payload: KEY_B },
        ],
      })
      .expect(201);

    const keys = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST}`)
      .expect(200);
    expect(keys.body.owed).toHaveLength(0);
  });
});

describe("encrypted group chat — messages", () => {
  const send = (
    agent: Awaited<ReturnType<typeof authedAgent>>["agent"],
    cartId: string,
    index: number,
    text = "x",
    deviceId = DEV_HOST,
  ) =>
    agent.post(`/api/groups/${cartId}/chat/messages`).send({
      senderDevice: deviceId,
      index,
      iv: IV,
      ciphertext: Buffer.from(text).toString("base64"),
      signature: SIG_A,
    });

  it("stores the ciphertext byte for byte and no plaintext column anywhere", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    const ciphertext = Buffer.from("this is not readable").toString("base64");

    const sent = await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext, signature: SIG_A })
      .expect(201);

    const row = await prisma.groupMessage.findUniqueOrThrow({
      where: { id: sent.body.message.id },
    });
    expect(row.ciphertext).toBe(ciphertext);
    expect(row.iv).toBe(IV);
    expect(row.signature).toBe(SIG_A);
    expect(row.senderDevice).toBe(DEV_HOST);
    expect(row.version).toBe(2);
    expect(Object.keys(row)).toEqual(
      expect.not.arrayContaining(["text", "body", "content", "plaintext"]),
    );
  });

  it("refuses to send from a device you do not own", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    // Speaking as the host's device would put a forged message on the host's
    // chain, where recipients would ratchet it as genuine.
    await send(friend.agent, cartId, 0, "forged", DEV_HOST).expect(403);
    expect(await prisma.groupMessage.count({ where: { cartId } })).toBe(0);
  });

  it("refuses to send from a device that was never registered", async () => {
    const { host, cartId } = await cartWithMember();
    await send(host.agent, cartId, 0, "x", "never-registered-1").expect(403);
  });

  it("uses each chain position exactly once", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await send(host.agent, cartId, 0).expect(201);
    // A repeated index is a replay or a client bug, and both end with a
    // recipient deriving a key for a message that is not the one it opens.
    await send(host.agent, cartId, 0).expect(409);
    await send(host.agent, cartId, 1).expect(201);
  });

  it("keeps each device's chain positions separate", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);
    // Two devices both at index 0 is normal: they are different chains.
    await send(host.agent, cartId, 0, "a", DEV_HOST).expect(201);
    await send(friend.agent, cartId, 0, "b", DEV_FRIEND).expect(201);
    expect(await prisma.groupMessage.count({ where: { cartId } })).toBe(2);
  });

  it("returns the chain position and signature a reader needs", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await send(host.agent, cartId, 0, "one").expect(201);
    await send(host.agent, cartId, 1, "two").expect(201);

    const all = await friend.agent.get(`/api/groups/${cartId}/chat/messages`).expect(200);
    expect(all.body.messages).toHaveLength(2);
    expect(all.body.messages[0]).toMatchObject({
      senderDevice: DEV_HOST,
      index: 0,
      version: 2,
      signature: SIG_A,
      isYou: false,
    });
    expect(all.body.messages[1].index).toBe(1);
  });

  it("can fetch only what is new", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await send(host.agent, cartId, 0, "m1").expect(201);
    const second = await send(host.agent, cartId, 1, "m2").expect(201);
    await send(host.agent, cartId, 2, "m3").expect(201);

    const since = await host.agent
      .get(`/api/groups/${cartId}/chat/messages?after=${second.body.message.createdAt}`)
      .expect(200);
    expect(since.body.messages).toHaveLength(1);
    expect(Buffer.from(since.body.messages[0].ciphertext, "base64").toString()).toBe("m3");
  });

  it("rejects anything that is not the shape of encrypted content", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    const post = (body: unknown) =>
      host.agent.post(`/api/groups/${cartId}/chat/messages`).send(body as object);

    // Plaintext would look exactly like this.
    await post({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext: "hello everyone!", signature: SIG_A }).expect(400);
    await post({ senderDevice: DEV_HOST, index: 0, ciphertext: KEY_A, signature: SIG_A }).expect(400);
    // Unsigned messages are not accepted: a signature is what proves who sent
    // it, and making it optional would make it worthless.
    await post({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext: KEY_A }).expect(400);
    await post({ senderDevice: DEV_HOST, index: -1, iv: IV, ciphertext: KEY_A, signature: SIG_A }).expect(400);
    await post({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext: "A".repeat(9000), signature: SIG_A }).expect(400);
    // An extra field means the client and server disagree about the protocol,
    // which is the last thing to be relaxed about in crypto code.
    await post({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext: KEY_A, signature: SIG_A, plaintext: "oops" }).expect(400);
  });
});

describe("encrypted group chat — history sync", () => {
  it("hands history between two devices of the same account", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(host.agent, cartId, DEV_HOST_2).expect(201);

    const payload = Buffer.from(JSON.stringify([{ text: "sealed" }])).toString("base64");
    await host.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send({ fromDevice: DEV_HOST, toDevice: DEV_HOST_2, senderKey: KEY_A, iv: IV, payload })
      .expect(201);

    const keys = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST_2}`)
      .expect(200);
    expect(keys.body.history.payload).toBe(payload);
    expect(keys.body.history.fromDevice).toBe(DEV_HOST);

    // The old device is not offered the history it sent.
    const other = await host.agent
      .get(`/api/groups/${cartId}/chat/keys?deviceId=${DEV_HOST}`)
      .expect(200);
    expect(other.body.history).toBeNull();
  });

  it("refuses to hand history to somebody else's device", async () => {
    const { host, friend, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(friend.agent, cartId, DEV_FRIEND, KEY_B).expect(201);

    // Letting anyone hand you a history would let a member rewrite what you
    // believe was said before you arrived.
    await host.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send({ fromDevice: DEV_HOST, toDevice: DEV_FRIEND, senderKey: KEY_A, iv: IV, payload: KEY_A })
      .expect(403);
    expect(await prisma.historySync.count({ where: { cartId } })).toBe(0);
  });

  it("refuses to overwrite a history already waiting", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(host.agent, cartId, DEV_HOST_2).expect(201);
    const body = (payload: string) => ({
      fromDevice: DEV_HOST,
      toDevice: DEV_HOST_2,
      senderKey: KEY_A,
      iv: IV,
      payload,
    });
    await host.agent.post(`/api/groups/${cartId}/chat/history`).send(body(KEY_A)).expect(201);
    const second = await host.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send(body(KEY_B))
      .expect(200);
    expect(second.body.written).toBe(false);
  });

  it("refuses a device syncing history to itself", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await host.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send({ fromDevice: DEV_HOST, toDevice: DEV_HOST, senderKey: KEY_A, iv: IV, payload: KEY_A })
      .expect(400);
  });

  it("clears a history once the receiving device has taken it", async () => {
    const { host, cartId } = await cartWithMember();
    await register(host.agent, cartId, DEV_HOST).expect(201);
    await register(host.agent, cartId, DEV_HOST_2).expect(201);
    await host.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send({ fromDevice: DEV_HOST, toDevice: DEV_HOST_2, senderKey: KEY_A, iv: IV, payload: KEY_A })
      .expect(201);

    // Not stored a moment longer than the handover needs.
    await host.agent.delete(`/api/groups/${cartId}/chat/history/${DEV_HOST_2}`).expect(200);
    expect(await prisma.historySync.count({ where: { cartId } })).toBe(0);
  });
});

describe("encrypted group chat — outsiders", () => {
  it("shuts every door on somebody who is not in the cart", async () => {
    const { cartId } = await cartWithMember();
    const outsider = await authedAgent();

    await outsider.agent.get(`/api/groups/${cartId}/chat/messages`).expect(403);
    await outsider.agent.get(`/api/groups/${cartId}/chat/keys`).expect(403);
    await outsider.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "outsider-device01", publicKey: KEY_A, signingKey: SIG_A })
      .expect(403);
    await outsider.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ senderDevice: "outsider-device01", index: 0, iv: IV, ciphertext: KEY_A, signature: SIG_A })
      .expect(403);
    await outsider.agent
      .post(`/api/groups/${cartId}/chat/history`)
      .send({ fromDevice: "outsider-device01", toDevice: "outsider-device02", senderKey: KEY_A, iv: IV, payload: KEY_A })
      .expect(403);
  });

  it("keeps two carts' conversations apart", async () => {
    const first = await cartWithMember();
    const second = await cartWithMember();
    await register(first.host.agent, first.cartId, DEV_HOST).expect(201);
    await first.host.agent
      .post(`/api/groups/${first.cartId}/chat/messages`)
      .send({ senderDevice: DEV_HOST, index: 0, iv: IV, ciphertext: KEY_A, signature: SIG_A })
      .expect(201);

    const other = await second.host.agent
      .get(`/api/groups/${second.cartId}/chat/messages`)
      .expect(200);
    expect(other.body.messages).toHaveLength(0);
  });
});
