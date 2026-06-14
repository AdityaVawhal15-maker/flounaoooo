import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { searchFood } from "../food/food.service.js";
import { sendPushToUser } from "../notifications/push.service.js";

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

// Short, unambiguous join code (no 0/O/1/I).
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i]! % alphabet.length];
  return code;
}

type CartWithItems = {
  id: string;
  code: string;
  hostId: string;
  platform: string;
  status: string;
  orderId: string | null;
  items: {
    id: string;
    userId: string;
    dishId: string;
    name: string;
    pricePaise: number;
    qty: number;
    user: { name: string };
  }[];
};

// Builds the per-member breakdown + equal split shown to everyone.
async function summarize(cartId: string, viewerId: string) {
  const cart = (await prisma.groupCart.findUnique({
    where: { id: cartId },
    include: {
      items: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  })) as CartWithItems | null;
  if (!cart) throw new ApiError(404, "Group order not found");

  const members = new Map<string, { name: string; subtotalPaise: number }>();
  for (const item of cart.items) {
    const cur = members.get(item.userId) ?? { name: item.user.name, subtotalPaise: 0 };
    cur.subtotalPaise += item.pricePaise * item.qty;
    members.set(item.userId, cur);
  }
  const totalPaise = cart.items.reduce((s, i) => s + i.pricePaise * i.qty, 0);
  const memberCount = Math.max(1, members.size);
  const equalSplitPaise = Math.round(totalPaise / memberCount);

  return {
    id: cart.id,
    code: cart.code,
    platform: cart.platform,
    status: cart.status,
    orderId: cart.orderId,
    isHost: cart.hostId === viewerId,
    totalPaise,
    equalSplitPaise,
    members: [...members.entries()].map(([userId, m]) => ({
      userId,
      name: m.name,
      subtotalPaise: m.subtotalPaise,
      isYou: userId === viewerId,
    })),
    items: cart.items.map((i) => ({
      id: i.id,
      userId: i.userId,
      memberName: i.user.name,
      dishId: i.dishId,
      name: i.name,
      pricePaise: i.pricePaise,
      qty: i.qty,
      isYou: i.userId === viewerId,
    })),
  };
}

// Membership = host OR has at least one item in the cart.
async function assertMember(cartId: string, userId: string) {
  const cart = await prisma.groupCart.findUnique({ where: { id: cartId } });
  if (!cart) throw new ApiError(404, "Group order not found");
  if (cart.hostId === userId) return cart;
  const hasItem = await prisma.groupCartItem.findFirst({
    where: { cartId, userId },
  });
  if (!hasItem) throw new ApiError(403, "Join this group order first");
  return cart;
}

// ---------- create ----------
groupsRouter.post(
  "/",
  validateBody(z.object({ platform: z.enum(["ondc", "swiggy", "zomato"]) })),
  async (req, res, next) => {
    try {
      const { platform } = req.body as { platform: "ondc" | "swiggy" | "zomato" };
      // Retry on the rare code collision.
      let cart;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          cart = await prisma.groupCart.create({
            data: { code: generateCode(), hostId: req.userId!, platform },
          });
          break;
        } catch {
          /* unique collision — try a new code */
        }
      }
      if (!cart) throw new ApiError(500, "Could not create group order");
      res.status(201).json(await summarize(cart.id, req.userId!));
    } catch (err) {
      next(err);
    }
  },
);

// ---------- join by code ----------
groupsRouter.post(
  "/join",
  validateBody(z.object({ code: z.string().trim().toUpperCase().length(6) })),
  async (req, res, next) => {
    try {
      const { code } = req.body as { code: string };
      const cart = await prisma.groupCart.findUnique({ where: { code } });
      if (!cart) throw new ApiError(404, "No group order with that code");
      if (cart.status !== "open") {
        throw new ApiError(409, "This group order is closed");
      }
      res.json(await summarize(cart.id, req.userId!));
    } catch (err) {
      next(err);
    }
  },
);

// ---------- view ----------
groupsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await summarize(req.params.id, req.userId!));
  } catch (err) {
    next(err);
  }
});

// ---------- add item ----------
groupsRouter.post(
  "/:id/items",
  validateBody(
    z.object({ dishId: z.string().max(60), qty: z.number().int().min(1).max(20).default(1) }),
  ),
  async (req, res, next) => {
    try {
      const { dishId, qty } = req.body as { dishId: string; qty: number };
      const cart = await prisma.groupCart.findUnique({ where: { id: req.params.id } });
      if (!cart) throw new ApiError(404, "Group order not found");
      if (cart.status !== "open") throw new ApiError(409, "This group order is closed");

      // Price comes from the cart's platform — server-trusted, never the client.
      const quote = searchFood({ query: "" }).find(
        (q) => q.dishId === dishId && q.platform === cart.platform,
      );
      if (!quote) throw new ApiError(404, "That dish isn't available on this platform");

      await prisma.groupCartItem.create({
        data: {
          cartId: cart.id,
          userId: req.userId!,
          dishId,
          name: quote.name,
          pricePaise: quote.effectivePaise,
          qty,
        },
      });

      // Let the host know someone added to the order.
      if (cart.hostId !== req.userId!) {
        void sendPushToUser(cart.hostId, {
          title: "Someone joined your group order 🍴",
          body: `${quote.name} was added.`,
          url: `/food/group/${cart.id}`,
        });
      }
      res.status(201).json(await summarize(cart.id, req.userId!));
    } catch (err) {
      next(err);
    }
  },
);

// ---------- remove own item ----------
groupsRouter.delete("/:id/items/:itemId", async (req, res, next) => {
  try {
    await assertMember(req.params.id, req.userId!);
    // You can only remove your own items.
    const deleted = await prisma.groupCartItem.deleteMany({
      where: { id: req.params.itemId, cartId: req.params.id, userId: req.userId! },
    });
    if (deleted.count === 0) throw new ApiError(404, "Item not found");
    res.json(await summarize(req.params.id, req.userId!));
  } catch (err) {
    next(err);
  }
});

// ---------- host places the combined order ----------
groupsRouter.post("/:id/checkout", async (req, res, next) => {
  try {
    const cart = await prisma.groupCart.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!cart) throw new ApiError(404, "Group order not found");
    if (cart.hostId !== req.userId!) {
      throw new ApiError(403, "Only the host can place the order");
    }
    if (cart.status !== "open") throw new ApiError(409, "Already checked out");
    if (cart.items.length === 0) throw new ApiError(400, "The cart is empty");

    const totalPaise = cart.items.reduce((s, i) => s + i.pricePaise * i.qty, 0);
    const memberCount = new Set(cart.items.map((i) => i.userId)).size;

    const order = await prisma.order.create({
      data: {
        userId: req.userId!,
        domain: "food",
        status: "pending_payment",
        provider: cart.platform,
        fulfillment: cart.platform === "ondc" ? "in_app" : "redirect",
        title: `Group order · ${cart.items.length} items · ${memberCount} people`,
        details: JSON.stringify({
          group: true,
          memberCount,
          items: cart.items.map((i) => ({
            name: i.name,
            qty: i.qty,
            pricePaise: i.pricePaise,
          })),
          equalSplitPaise: Math.round(totalPaise / memberCount),
          comparedOptions: 0,
        }),
        amount: totalPaise,
      },
    });

    await prisma.groupCart.update({
      where: { id: cart.id },
      data: { status: "ordered", orderId: order.id },
    });

    res.json({ orderId: order.id });
  } catch (err) {
    next(err);
  }
});
