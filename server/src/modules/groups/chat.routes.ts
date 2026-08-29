import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { sendPushToUser } from "../../modules/notifications/push.service.js";

// End-to-end encrypted group chat.
//
// Everything in this file is deliberately dumb about content. The server holds
// three things: public keys, sealed envelopes it has no key for, and ciphertext
// with a nonce. It knows who spoke and when, because it has to route and order
// messages, and it knows nothing about what was said.
//
// What that buys, stated honestly: nobody reading the database — including us,
// including a subpoena, including a stolen backup — can read a message. What it
// does not buy: the server still serves the JavaScript that does the crypto, so
// a compromised build could betray a user. That is true of every in-browser
// E2EE product and the UI says so rather than implying otherwise.
//
// The key exchange is ECDH P-256 → HKDF → AES-GCM, all via WebCrypto in the
// browser. A member who holds the group key seals it once per recipient device.
// Nothing here validates the crypto, because it cannot: to the server an
// envelope is an opaque string, and pretending to check it would be theatre.

export const groupChatRouter = Router({ mergeParams: true });

/**
 * The cart id arrives from the parent router through mergeParams, which Express
 * cannot type for a child router — so it is read through one narrow cast here
 * rather than a cast at every use.
 */
function cartIdOf(req: { params: unknown }): string {
  const id = (req.params as { id?: string }).id;
  if (!id) throw new ApiError(404, "Group order not found");
  return id;
}
groupChatRouter.use(requireAuth);

/** Base64 of a bounded size — enough to reject junk without parsing crypto. */
const b64 = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9+/=]+$/, "Expected base64");

/** Membership is the whole access-control story: chat is per-cart. */
async function assertMember(cartId: string, userId: string) {
  const cart = await prisma.groupCart.findUnique({
    where: { id: cartId },
    select: { id: true, hostId: true, name: true },
  });
  if (!cart) throw new ApiError(404, "Group order not found");
  if (cart.hostId === userId) return cart;
  const member = await prisma.groupCartMember.findUnique({
    where: { cartId_userId: { cartId, userId } },
  });
  if (!member) throw new ApiError(403, "Join this group order first");
  return cart;
}

// ---------- device identity ----------

/**
 * Registers this browser's public key.
 *
 * Re-registering the same deviceId replaces the key, which is what happens when
 * a user clears site data: the old private key is gone for good, so the old
 * public key is worthless and keeping it would only cause members to seal
 * envelopes nobody can open.
 */
groupChatRouter.post(
  "/devices",
  validateBody(
    z
      .object({
        deviceId: z.string().trim().min(8).max(64),
        publicKey: b64(500),
        label: z.string().trim().max(60).optional(),
      })
      .strict(),
  ),
  async (req, res, next) => {
    try {
      const { deviceId, publicKey, label } = req.body as {
        deviceId: string;
        publicKey: string;
        label?: string;
      };
      const device = await prisma.chatDevice.upsert({
        where: { userId_deviceId: { userId: req.userId!, deviceId } },
        create: { userId: req.userId!, deviceId, publicKey, label },
        update: { publicKey, label, lastSeenAt: new Date() },
        select: { deviceId: true, publicKey: true, createdAt: true },
      });
      res.status(201).json({ device });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- key distribution ----------

/**
 * Everything this device needs to join the conversation: every member device's
 * public key, and the envelope addressed to this device if one exists yet.
 *
 * Public keys are public by definition, so returning them to a fellow member is
 * not a leak. Envelopes are scoped to the caller — you are never handed one
 * sealed for somebody else, because that is exactly the string an attacker
 * would want to collect and grind on offline.
 */
groupChatRouter.get("/keys", async (req, res, next) => {
  try {
    await assertMember(cartIdOf(req), req.userId!);
    const cart = await prisma.groupCart.findUniqueOrThrow({
      where: { id: cartIdOf(req) },
      select: { hostId: true, members: { select: { userId: true } } },
    });
    const memberIds = [...new Set([cart.hostId, ...cart.members.map((m) => m.userId)])];

    const devices = await prisma.chatDevice.findMany({
      where: { userId: { in: memberIds } },
      select: { userId: true, deviceId: true, publicKey: true },
      orderBy: { createdAt: "asc" },
    });

    const mine = await prisma.groupKeyEnvelope.findMany({
      where: { cartId: cartIdOf(req), userId: req.userId! },
      select: { deviceId: true, senderKey: true, iv: true, wrappedKey: true },
    });

    // Which member devices are still waiting to be let in. Whoever holds the
    // key seals for these on their next poll, so a late joiner does not depend
    // on the host being awake.
    const sealed = await prisma.groupKeyEnvelope.findMany({
      where: { cartId: cartIdOf(req) },
      select: { userId: true, deviceId: true },
    });
    const has = new Set(sealed.map((e) => `${e.userId}:${e.deviceId}`));
    const pending = devices.filter((d) => !has.has(`${d.userId}:${d.deviceId}`));

    res.json({ devices, envelopes: mine, pending });
  } catch (err) {
    next(err);
  }
});

/**
 * Uploads envelopes sealed for other people's devices.
 *
 * The server cannot tell a good envelope from a bad one, so it does the two
 * checks it actually can: the recipient must be a member of this cart, and an
 * envelope that already exists is not overwritten. Without that second rule any
 * member could replace everyone's envelope with one wrapping a key of their
 * choosing and quietly fork the conversation.
 */
groupChatRouter.post(
  "/keys",
  validateBody(
    z
      .object({
        envelopes: z
          .array(
            z
              .object({
                userId: z.string().cuid(),
                deviceId: z.string().trim().min(8).max(64),
                senderKey: b64(500),
                iv: b64(64),
                wrappedKey: b64(500),
              })
              .strict(),
          )
          .min(1)
          .max(40),
      })
      .strict(),
  ),
  async (req, res, next) => {
    try {
      const cartId = cartIdOf(req);
      await assertMember(cartId, req.userId!);
      const { envelopes } = req.body as {
        envelopes: {
          userId: string;
          deviceId: string;
          senderKey: string;
          iv: string;
          wrappedKey: string;
        }[];
      };

      const cart = await prisma.groupCart.findUniqueOrThrow({
        where: { id: cartId },
        select: { hostId: true, members: { select: { userId: true } } },
      });
      const memberIds = new Set([cart.hostId, ...cart.members.map((m) => m.userId)]);

      let written = 0;
      for (const e of envelopes) {
        if (!memberIds.has(e.userId)) continue; // not in this room
        try {
          await prisma.groupKeyEnvelope.create({ data: { cartId, ...e } });
          written++;
        } catch {
          // Already sealed for that device. First writer wins, on purpose.
        }
      }
      res.status(201).json({ written });
    } catch (err) {
      next(err);
    }
  },
);

// ---------- messages ----------

const MAX_CIPHERTEXT = 8000; // ~4KB of plaintext once base64 and GCM overhead

groupChatRouter.get("/messages", async (req, res, next) => {
  try {
    await assertMember(cartIdOf(req), req.userId!);
    // `after` lets the client poll for just what is new instead of refetching
    // a conversation it already holds in plaintext locally.
    const after = typeof req.query.after === "string" ? req.query.after : undefined;
    const cursor = after ? new Date(after) : undefined;
    const messages = await prisma.groupMessage.findMany({
      where: {
        cartId: cartIdOf(req),
        ...(cursor && !Number.isNaN(cursor.getTime())
          ? { createdAt: { gt: cursor } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        senderId: true,
        iv: true,
        ciphertext: true,
        createdAt: true,
        sender: { select: { name: true } },
      },
    });
    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.name,
        isYou: m.senderId === req.userId,
        iv: m.iv,
        ciphertext: m.ciphertext,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

groupChatRouter.post(
  "/messages",
  validateBody(
    z
      .object({ iv: b64(64), ciphertext: b64(MAX_CIPHERTEXT) })
      .strict(),
  ),
  async (req, res, next) => {
    try {
      const cartId = cartIdOf(req);
      const cart = await assertMember(cartId, req.userId!);
      const { iv, ciphertext } = req.body as { iv: string; ciphertext: string };

      const message = await prisma.groupMessage.create({
        data: { cartId, senderId: req.userId!, iv, ciphertext },
        select: { id: true, senderId: true, iv: true, ciphertext: true, createdAt: true },
      });

      // The push cannot carry the message, because the server does not have it.
      // It says who spoke and where; the text appears once the app decrypts it.
      const me = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { name: true },
      });
      const others = await prisma.groupCartMember.findMany({
        where: { cartId, NOT: { userId: req.userId! } },
        select: { userId: true },
      });
      for (const o of others) {
        void sendPushToUser(o.userId, {
          title: cart.name ? `${cart.name}` : "Group order",
          body: `${me?.name ?? "Someone"} sent a message`,
          url: `/food/group/${cartId}/chat`,
        });
      }

      res.status(201).json({ message: { ...message, isYou: true } });
    } catch (err) {
      next(err);
    }
  },
);
