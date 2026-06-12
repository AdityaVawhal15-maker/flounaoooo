import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { env } from "../../config/env.js";
import { quoteRides } from "./rides.service.js";
import { adviseRide } from "../advisor/advisor.service.js";

export const ridesRouter = Router();
ridesRouter.use(requireAuth);

// Fallback places so location search works before a Geoapify key exists.
const DEMO_PLACES = [
  { name: "Rajiv Gandhi International Airport", area: "Shamshabad", lat: 17.2403, lng: 78.4294 },
  { name: "Hitech City", area: "Madhapur", lat: 17.4435, lng: 78.3772 },
  { name: "Charminar", area: "Old City", lat: 17.3616, lng: 78.4747 },
  { name: "Secunderabad Railway Station", area: "Secunderabad", lat: 17.4344, lng: 78.5013 },
  { name: "Banjara Hills", area: "Road No. 12", lat: 17.4126, lng: 78.4392 },
  { name: "Gachibowli Stadium", area: "Gachibowli", lat: 17.4401, lng: 78.3489 },
  { name: "Inorbit Mall", area: "Mindspace", lat: 17.4344, lng: 78.3866 },
  { name: "Osmania University", area: "Amberpet", lat: 17.4137, lng: 78.5286 },
];

ridesRouter.get("/geocode", async (req, res, next) => {
  try {
    const q = z.string().min(2).max(120).parse(req.query.q);

    if (env.GEOAPIFY_KEY) {
      const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
      url.searchParams.set("text", q);
      url.searchParams.set("filter", "countrycode:in");
      url.searchParams.set("limit", "6");
      url.searchParams.set("apiKey", env.GEOAPIFY_KEY);
      const r = await fetch(url);
      if (r.ok) {
        const data = (await r.json()) as {
          features?: Array<{
            properties: {
              name?: string;
              formatted?: string;
              suburb?: string;
              city?: string;
              lat: number;
              lon: number;
            };
          }>;
        };
        return res.json({
          places: (data.features ?? []).map((f) => ({
            name: f.properties.name ?? f.properties.formatted ?? "Unknown",
            area: f.properties.suburb ?? f.properties.city ?? "",
            lat: f.properties.lat,
            lng: f.properties.lon,
          })),
        });
      }
    }

    const needle = q.toLowerCase();
    res.json({
      places: DEMO_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.area.toLowerCase().includes(needle),
      ).slice(0, 6),
    });
  } catch (err) {
    next(err);
  }
});

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const routeQuery = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLng: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLng: z.coerce.number().min(-180).max(180),
});

ridesRouter.get("/route", async (req, res, next) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = routeQuery.parse(req.query);

    if (env.ORS_KEY) {
      const r = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.ORS_KEY,
          },
          body: JSON.stringify({
            coordinates: [
              [fromLng, fromLat],
              [toLng, toLat],
            ],
          }),
        },
      );
      if (r.ok) {
        const data = (await r.json()) as {
          features?: Array<{
            geometry: { coordinates: [number, number][] };
            properties: { summary: { distance: number; duration: number } };
          }>;
        };
        const feature = data.features?.[0];
        if (feature) {
          return res.json({
            distanceKm: feature.properties.summary.distance / 1000,
            rideMinutes: Math.round(feature.properties.summary.duration / 60),
            geometry: feature.geometry.coordinates,
          });
        }
      }
    }

    // Fallback: straight-line distance with a road-winding factor at city speed.
    const crowKm = haversineKm(fromLat, fromLng, toLat, toLng);
    const distanceKm = Math.max(1, crowKm * 1.3);
    res.json({
      distanceKm,
      rideMinutes: Math.max(5, Math.round((distanceKm / 25) * 60)),
      geometry: [
        [fromLng, fromLat],
        [toLng, toLat],
      ],
    });
  } catch (err) {
    next(err);
  }
});

ridesRouter.get("/quotes", (req, res, next) => {
  try {
    const parsed = z
      .object({
        distanceKm: z.coerce.number().positive().max(150),
        rideMinutes: z.coerce.number().int().positive().max(600),
        vehicle: z.enum(["bike", "auto", "cab", "any"]).default("any"),
      })
      .parse(req.query);
    res.json({ quotes: quoteRides(parsed), advice: adviseRide() });
  } catch (err) {
    next(err);
  }
});
