import { describe, expect, it } from "vitest";
import { authedAgent } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

// Encrypted group chat, tested as the transport it is.
//
// The server cannot verify any of the cryptography — to it an envelope is an
// opaque string — so these tests check the things it CAN get wrong, which are
// all the ways it might hand the wrong bytes to the wrong person: letting a
// non-member read, handing someone an envelope sealed for another device,
// letting a member overwrite everyone's envelope with their own key, and
// quietly storing something other than what was sent.

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

const KEY_A = Buffer.from("a".repeat(64)).toString("base64");
const KEY_B = Buffer.from("b".repeat(64)).toString("base64");
const IV = Buffer.from("0123456789ab").toString("base64");

async function userId(email: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
  return u.id;
}

describe("encrypted group chat", () => {
  it("registers a device key and hands it to fellow members", async () => {
    const { host, friend, cartId } = await cartWithMember();

    await host.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "host-device-0001", publicKey: KEY_A })
      .expect(201);
    await friend.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "friend-device-001", publicKey: KEY_B })
      .expect(201);

    // Public keys are public — a member must be able to seal for the others.
    const keys = await host.agent.get(`/api/groups/${cartId}/chat/keys`).expect(200);
    const ids = keys.body.devices.map((d: { deviceId: string }) => d.deviceId).sort();
    expect(ids).toEqual(["friend-device-001", "host-device-0001"]);
    // Nobody has been let in yet, so both devices are waiting.
    expect(keys.body.pending).toHaveLength(2);
    expect(keys.body.envelopes).toEqual([]);
  });

  it("replaces a device's key when the browser re-registers it", async () => {
    const { host, cartId } = await cartWithMember();
    await host.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "host-device-0001", publicKey: KEY_A })
      .expect(201);
    // Clearing site data destroys the private half; keeping the old public key
    // would only make members seal envelopes nobody can ever open.
    await host.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "host-device-0001", publicKey: KEY_B })
      .expect(201);

    const keys = await host.agent.get(`/api/groups/${cartId}/chat/keys`).expect(200);
    expect(keys.body.devices).toHaveLength(1);
    expect(keys.body.devices[0].publicKey).toBe(KEY_B);
  });

  it("gives each device only the envelope addressed to it", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const hostId = await userId(host.email);
    const friendId = await userId(friend.email);

    await host.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "host-device-0001", publicKey: KEY_A })
      .expect(201);
    await friend.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "friend-device-001", publicKey: KEY_B })
      .expect(201);

    await host.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        envelopes: [
          { userId: hostId, deviceId: "host-device-0001", senderKey: KEY_A, iv: IV, wrappedKey: KEY_A },
          { userId: friendId, deviceId: "friend-device-001", senderKey: KEY_A, iv: IV, wrappedKey: KEY_B },
        ],
      })
      .expect(201);

    // An envelope sealed for someone else is exactly what an attacker would
    // want to collect and grind on offline, so it is never handed over.
    const mine = await friend.agent.get(`/api/groups/${cartId}/chat/keys`).expect(200);
    expect(mine.body.envelopes).toHaveLength(1);
    expect(mine.body.envelopes[0].deviceId).toBe("friend-device-001");
    expect(mine.body.envelopes[0].wrappedKey).toBe(KEY_B);
    expect(JSON.stringify(mine.body.envelopes)).not.toContain("host-device-0001");
    expect(mine.body.pending).toHaveLength(0);
  });

  it("refuses to overwrite an envelope that already exists", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const friendId = await userId(friend.email);
    await friend.agent
      .post(`/api/groups/${cartId}/chat/devices`)
      .send({ deviceId: "friend-device-001", publicKey: KEY_B })
      .expect(201);

    const seal = (wrappedKey: string) =>
      host.agent.post(`/api/groups/${cartId}/chat/keys`).send({
        envelopes: [
          { userId: friendId, deviceId: "friend-device-001", senderKey: KEY_A, iv: IV, wrappedKey },
        ],
      });

    const first = await seal(KEY_A).expect(201);
    expect(first.body.written).toBe(1);

    // Without first-writer-wins, any member could reseal everyone's envelope
    // around a key of their choosing and fork the conversation onto it.
    const second = await seal(KEY_B).expect(201);
    expect(second.body.written).toBe(0);

    const got = await friend.agent.get(`/api/groups/${cartId}/chat/keys`).expect(200);
    expect(got.body.envelopes[0].wrappedKey).toBe(KEY_A);
  });

  it("ignores an envelope addressed to somebody outside the cart", async () => {
    const { host, cartId } = await cartWithMember();
    const outsider = await authedAgent();
    const outsiderId = await userId(outsider.email);

    const res = await host.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        envelopes: [
          { userId: outsiderId, deviceId: "outsider-device01", senderKey: KEY_A, iv: IV, wrappedKey: KEY_A },
        ],
      })
      .expect(201);
    expect(res.body.written).toBe(0);
    expect(
      await prisma.groupKeyEnvelope.count({ where: { cartId, userId: outsiderId } }),
    ).toBe(0);
  });

  it("stores the ciphertext byte for byte and never a plaintext column", async () => {
    const { host, cartId } = await cartWithMember();
    const ciphertext = Buffer.from("this is not readable").toString("base64");

    const sent = await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ iv: IV, ciphertext })
      .expect(201);
    expect(sent.body.message.ciphertext).toBe(ciphertext);

    // Straight from the table: the row carries a nonce and a blob, and no
    // column anywhere that could hold what was said.
    const row = await prisma.groupMessage.findUniqueOrThrow({
      where: { id: sent.body.message.id },
    });
    expect(row.ciphertext).toBe(ciphertext);
    expect(row.iv).toBe(IV);
    expect(Object.keys(row)).toEqual(
      expect.not.arrayContaining(["text", "body", "content", "plaintext"]),
    );
  });

  it("returns messages in order and can fetch only what is new", async () => {
    const { host, friend, cartId } = await cartWithMember();
    const send = (agent: typeof host.agent, n: number) =>
      agent
        .post(`/api/groups/${cartId}/chat/messages`)
        .send({ iv: IV, ciphertext: Buffer.from(`m${n}`).toString("base64") })
        .expect(201);

    await send(host.agent, 1);
    const second = await send(friend.agent, 2);
    await send(host.agent, 3);

    const all = await host.agent.get(`/api/groups/${cartId}/chat/messages`).expect(200);
    expect(all.body.messages).toHaveLength(3);
    expect(all.body.messages[0].isYou).toBe(true);
    expect(all.body.messages[1].isYou).toBe(false);

    const since = await host.agent
      .get(`/api/groups/${cartId}/chat/messages?after=${second.body.message.createdAt}`)
      .expect(200);
    expect(since.body.messages).toHaveLength(1);
    expect(Buffer.from(since.body.messages[0].ciphertext, "base64").toString()).toBe("m3");
  });

  it("shuts every door on somebody who is not in the cart", async () => {
    const { cartId } = await cartWithMember();
    const outsider = await authedAgent();

    await outsider.agent.get(`/api/groups/${cartId}/chat/messages`).expect(403);
    await outsider.agent.get(`/api/groups/${cartId}/chat/keys`).expect(403);
    await outsider.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ iv: IV, ciphertext: KEY_A })
      .expect(403);
    await outsider.agent
      .post(`/api/groups/${cartId}/chat/keys`)
      .send({
        envelopes: [
          { userId: "cxxxxxxxxxxxxxxxxxxxxxxxx", deviceId: "outsider-device01", senderKey: KEY_A, iv: IV, wrappedKey: KEY_A },
        ],
      })
      .expect(403);
  });

  it("rejects anything that is not the shape of encrypted content", async () => {
    const { host, cartId } = await cartWithMember();

    // Not base64 — a plaintext message would look exactly like this.
    await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ iv: IV, ciphertext: "hello everyone!" })
      .expect(400);
    // Missing nonce.
    await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ ciphertext: KEY_A })
      .expect(400);
    // Beyond the size cap.
    await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ iv: IV, ciphertext: "A".repeat(9000) })
      .expect(400);
    // An extra field is a sign the client and server disagree about the
    // protocol, which is the last thing to be relaxed about in crypto code.
    await host.agent
      .post(`/api/groups/${cartId}/chat/messages`)
      .send({ iv: IV, ciphertext: KEY_A, plaintext: "oops" })
      .expect(400);
  });

  it("keeps two carts' conversations apart", async () => {
    const first = await cartWithMember();
    const second = await cartWithMember();

    await first.host.agent
      .post(`/api/groups/${first.cartId}/chat/messages`)
      .send({ iv: IV, ciphertext: Buffer.from("first cart").toString("base64") })
      .expect(201);

    const other = await second.host.agent
      .get(`/api/groups/${second.cartId}/chat/messages`)
      .expect(200);
    expect(other.body.messages).toHaveLength(0);
  });
});
