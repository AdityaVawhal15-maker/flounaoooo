import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { ApiError } from "../../middleware/error.js";
import { checkMessage, FIREWALL_REPLIES } from "./firewall.js";
import { llm, demoFallback } from "./llm/index.js";
import type { Intent } from "./llm/types.js";
import { recommendFood } from "../food/food.service.js";
import { quoteRides } from "../rides/rides.service.js";
import { adviseFood, adviseRide } from "../advisor/advisor.service.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

// Layer 4 of the firewall: per-user chat budget.
const chatLimit = rateLimit({
  windowMs: 60_000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? req.ip ?? "anon",
  message: { error: "You're sending messages too fast — give me a few seconds." },
});

type AssistantPayload = {
  reply: string;
  intent: Intent;
  recommendation?: unknown;
};

async function buildAssistantPayload(message: string): Promise<AssistantPayload> {
  let intent: Intent;
  try {
    intent = await llm.extractIntent(message);
  } catch (err) {
    // Provider outage must never take chat down — degrade to rule-based mode.
    console.error(`[chat] ${llm.name} provider failed, using demo fallback:`, err);
    intent = await demoFallback.extractIntent(message);
  }

  if (intent.domain === "combo" && intent.food && intent.ride) {
    const foodRec = recommendFood({
      query: intent.food.item,
      budgetPaise: intent.food.budgetPaise,
      dietary: intent.food.dietary,
    });
    const rideQuotes = quoteRides({
      distanceKm: 8,
      rideMinutes: 24,
      vehicle: intent.ride.vehicle,
    });
    return {
      reply: intent.reply,
      intent,
      recommendation: {
        type: "combo",
        food: foodRec ? { ...foodRec, advice: adviseFood() } : null,
        ride: {
          drop: intent.ride.drop,
          pickup: intent.ride.pickup,
          quotes: rideQuotes.slice(0, 3),
          why: `Cheapest fare is ${rideQuotes[0]?.productName} — open Rides to set exact pickup.`,
          advice: adviseRide(),
        },
      },
    };
  }

  if (intent.domain === "food" && intent.food) {
    const rec = recommendFood({
      query: intent.food.item,
      budgetPaise: intent.food.budgetPaise,
      dietary: intent.food.dietary,
    });
    if (rec) {
      return {
        reply: intent.reply,
        intent,
        recommendation: { type: "food", ...rec, advice: adviseFood() },
      };
    }
    return {
      reply: `I couldn't find "${intent.food.item}" near you right now — try biryani, pizza, dosa, or a thali?`,
      intent,
    };
  }

  if (intent.domain === "ride" && intent.ride) {
    // Without live geocoding in chat we quote a typical city trip;
    // exact fares come from the rides screen once locations are picked.
    const quotes = quoteRides({ distanceKm: 8, rideMinutes: 24, vehicle: intent.ride.vehicle });
    return {
      reply: intent.reply,
      intent,
      recommendation: {
        type: "ride",
        drop: intent.ride.drop,
        pickup: intent.ride.pickup,
        quotes: quotes.slice(0, 5),
        why: `Cheapest effective fare is ${quotes[0]?.productName} after offers — open Rides to set exact pickup and book.`,
        advice: adviseRide(),
      },
    };
  }

  return { reply: intent.reply, intent };
}

chatRouter.post(
  "/message",
  chatLimit,
  validateBody(
    z.object({
      message: z.string().max(2000),
      sessionId: z.string().cuid().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { message, sessionId } = req.body as {
        message: string;
        sessionId?: string;
      };

      const verdict = checkMessage(message);

      let session =
        sessionId &&
        (await prisma.chatSession.findFirst({
          where: { id: sessionId, userId: req.userId! },
        }));
      if (sessionId && !session) throw new ApiError(404, "Chat not found");
      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            userId: req.userId!,
            title: message.trim().slice(0, 60),
          },
        });
      }

      await prisma.chatMessage.create({
        data: { sessionId: session.id, role: "user", content: message.trim().slice(0, 500) },
      });

      const payload: AssistantPayload = verdict.ok
        ? await buildAssistantPayload(message.trim())
        : {
            reply: FIREWALL_REPLIES[verdict.reason],
            intent: { domain: "out_of_scope", reply: FIREWALL_REPLIES[verdict.reason] },
          };

      const assistantMessage = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: payload.reply,
          intent: JSON.stringify({
            domain: payload.intent.domain,
            recommendation: payload.recommendation ?? null,
          }),
        },
      });

      res.json({
        sessionId: session.id,
        message: {
          id: assistantMessage.id,
          role: "assistant",
          content: payload.reply,
          domain: payload.intent.domain,
          recommendation: payload.recommendation ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

chatRouter.get("/sessions", async (req, res, next) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.userId! },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    });
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

chatRouter.get("/sessions/:id", async (req, res, next) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 100 },
      },
    });
    if (!session) throw new ApiError(404, "Chat not found");
    res.json({
      session: {
        id: session.id,
        title: session.title,
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          ...(m.intent ? JSON.parse(m.intent) : {}),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
