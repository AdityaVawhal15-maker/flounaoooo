import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { recommendFood, searchFood } from "./food.service.js";
import { dishes } from "../../data/restaurants.js";
import { adviseFood } from "../advisor/advisor.service.js";

export const foodRouter = Router();
foodRouter.use(requireAuth);

const CATEGORIES = ["All", "Burger", "Pizza", "Healthy", "South Indian", "Dessert"];

// Landing feed: AI picks + smart suggestion stats, per the Figma food landing.
foodRouter.get("/feed", (_req, res) => {
  const picks = ["quinoa-bowl", "mushroom-pasta", "masala-dosa"]
    .map((id) => dishes.find((d) => d.id === id))
    .filter((d) => d !== undefined)
    .map((d) => {
      const best = searchFood({ query: d.name })[0];
      return best;
    })
    .filter((q) => q !== undefined);

  const all = searchFood({ query: "" });
  const fastest = Math.min(...all.map((q) => q.etaMinutes));
  const topRated = dishes.filter((d) => d.rating >= 4.0).length;

  res.json({
    categories: CATEGORIES,
    picks,
    suggestions: {
      fastestDeliveryMinutes: fastest,
      nearestKm: 1.5,
      topRatedCount: topRated,
    },
    advice: adviseFood(),
  });
});

const searchQuery = z.object({
  q: z.string().max(120).default(""),
  budget: z.coerce.number().int().positive().optional(), // rupees
  dietary: z.enum(["veg", "nonveg", "any"]).default("any"),
});

foodRouter.get("/search", (req, res, next) => {
  try {
    const parsed = searchQuery.parse(req.query);
    const quotes = searchFood({
      query: parsed.q,
      budgetPaise: parsed.budget ? parsed.budget * 100 : null,
      dietary: parsed.dietary,
    });
    res.json({ quotes: quotes.slice(0, 24) });
  } catch (err) {
    next(err);
  }
});

foodRouter.get("/recommend", (req, res, next) => {
  try {
    const parsed = searchQuery.parse(req.query);
    const rec = recommendFood({
      query: parsed.q,
      budgetPaise: parsed.budget ? parsed.budget * 100 : null,
      dietary: parsed.dietary,
    });
    res.json({ recommendation: rec });
  } catch (err) {
    next(err);
  }
});

// Quote detail for the order screen — dish + chosen platform listing.
foodRouter.get("/dishes/:dishId", (req, res) => {
  const quotes = searchFood({ query: "" }).filter(
    (q) => q.dishId === req.params.dishId,
  );
  if (quotes.length === 0) {
    return res.status(404).json({ error: "Dish not found" });
  }
  res.json({ quotes });
});
