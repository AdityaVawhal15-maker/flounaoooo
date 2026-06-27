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
import { recommendProduct } from "../shop/shop.service.js";
import { adviseFood, adviseRide } from "../advisor/advisor.service.js";
import { recordObservation } from "../advisor/priceHistory.service.js";
import { weeklyFoodBudget } from "../users/budget.service.js";

// Paise → "₹123" for chat copy.
const rupees = (paise: number) => `₹${Math.round(paise / 100)}`;

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

// A short budget line shown under a food pick — only when a budget is set.
function budgetNoteFor(
  budget: Awaited<ReturnType<typeof weeklyFoodBudget>>,
  pickPaise: number,
): string | null {
  if (budget.remainingPaise == null) return null;
  const afterPaise = budget.remainingPaise - pickPaise;
  if (afterPaise < 0) {
    return `Heads up — this is ${rupees(-afterPaise)} over your weekly food budget.`;
  }
  return `${rupees(afterPaise)} left in your weekly food budget after this.`;
}

async function buildAssistantPayload(
  message: string,
  userId: string,
): Promise<AssistantPayload> {
  let intent: Intent;
  try {
    intent = await llm.extractIntent(message);
  } catch (err) {
    // Provider outage must never take chat down — degrade to rule-based mode.
    console.error(`[chat] ${llm.name} provider failed, using demo fallback:`, err);
    intent = await demoFallback.extractIntent(message);
  }

  if (intent.domain === "combo" && intent.food && intent.ride) {
    const comboBudget = await weeklyFoodBudget(userId);
    const comboCap =
      intent.food.budgetPaise ??
      (comboBudget.remainingPaise && comboBudget.remainingPaise > 0
        ? comboBudget.remainingPaise
        : null);
    const foodRec = recommendFood({
      query: intent.food.item,
      budgetPaise: comboCap,
      dietary: intent.food.dietary,
      priority: intent.food.priority,
    });
    const rideQuotes = quoteRides({
      distanceKm: 8,
      rideMinutes: 24,
      vehicle: intent.ride.vehicle,
      priority: intent.ride.priority,
    });
    if (foodRec) recordObservation("food", foodRec.best.dishId, foodRec.best.effectivePaise);
    if (rideQuotes[0]) recordObservation("ride", rideQuotes[0].vehicle, rideQuotes[0].effectivePaise);
    return {
      reply: intent.reply,
      intent,
      recommendation: {
        type: "combo",
        food: foodRec
          ? { ...foodRec, advice: await adviseFood(foodRec.best.dishId) }
          : null,
        ride: {
          drop: intent.ride.drop,
          pickup: intent.ride.pickup,
          quotes: rideQuotes.slice(0, 3),
          why: `Cheapest fare is ${rideQuotes[0]?.productName} — open Rides to set exact pickup.`,
          advice: await adviseRide(rideQuotes[0]?.vehicle ?? null),
        },
      },
    };
  }

  if (intent.domain === "food" && intent.food) {
    // Budget Guardian awareness: if the user didn't name a budget but has a
    // weekly food budget set, cap suggestions at what's left this week.
    const budget = await weeklyFoodBudget(userId);
    const weeklyCap =
      budget.remainingPaise != null && budget.remainingPaise > 0
        ? budget.remainingPaise
        : null;
    const effectiveBudget = intent.food.budgetPaise ?? weeklyCap;

    const rec = recommendFood({
      query: intent.food.item,
      budgetPaise: effectiveBudget,
      dietary: intent.food.dietary,
      priority: intent.food.priority,
    });
    if (rec) {
      recordObservation("food", rec.best.dishId, rec.best.effectivePaise);
      // If the best in-budget pick still exceeds what's left, the engine returns
      // the cheapest option anyway — we surface that honestly via the note
      // rather than hiding it or refusing.
      const budgetNote = budgetNoteFor(budget, rec.best.effectivePaise);
      return {
        reply: intent.reply,
        intent,
        recommendation: {
          type: "food",
          ...rec,
          advice: await adviseFood(rec.best.dishId),
          ...(budgetNote ? { budgetNote } : {}),
        },
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
    const quotes = quoteRides({
      distanceKm: 8,
      rideMinutes: 24,
      vehicle: intent.ride.vehicle,
      priority: intent.ride.priority,
    });
    if (quotes[0]) recordObservation("ride", quotes[0].vehicle, quotes[0].effectivePaise);
    // Send the full spread so the chat's Bike/Cab/Auto switcher always has
    // every available vehicle type (we only cap when a specific type was asked).
    const sent =
      intent.ride.vehicle && intent.ride.vehicle !== "any"
        ? quotes.slice(0, 5)
        : quotes;
    return {
      reply: intent.reply,
      intent,
      recommendation: {
        type: "ride",
        drop: intent.ride.drop,
        pickup: intent.ride.pickup,
        quotes: sent,
        why: `Cheapest effective fare is ${quotes[0]?.productName} after offers — open Rides to set exact pickup and book.`,
        advice: await adviseRide(quotes[0]?.vehicle ?? null),
      },
    };
  }

  if (intent.domain === "shop" && intent.shop) {
    const rec = recommendProduct({
      query: intent.shop.item,
      budgetPaise: intent.shop.budgetPaise,
      category: intent.shop.category === "any" ? null : intent.shop.category,
    });
    if (rec) {
      return {
        reply: intent.reply,
        intent,
        recommendation: { type: "shop", ...rec },
      };
    }
    return {
      reply: `I couldn't find "${intent.shop.item}" right now — try a laptop, earbuds, shoes, or a smartwatch?`,
      intent,
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
        ? await buildAssistantPayload(message.trim(), req.userId!)
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
