"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "@/lib/api";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : "https://demotiles.maplibre.org/style.json";

export type LatLng = { lat: number; lng: number };

type RouteInfo = {
  distanceKm: number;
  rideMinutes: number;
  geometry: [number, number][]; // [lng, lat][]
};

// `progress` is 0→1 along the pickup→drop route; the driver marker sits there.
// While the driver is still approaching (pre-pickup) `progress` stays 0 and we
// show the driver a little behind the pickup so it visibly closes in.
export function LiveTrackingMap({
  pickup,
  drop,
  progress,
  phase,
}: {
  pickup: LatLng;
  drop: LatLng;
  progress: number;
  phase: "arriving" | "enroute" | "done";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const driverRef = useRef<Marker | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);

  // Fetch the route once we know both ends (offline fallback handled by API).
  useEffect(() => {
    let cancelled = false;
    api<RouteInfo>(
      `/api/rides/route?fromLat=${pickup.lat}&fromLng=${pickup.lng}&toLat=${drop.lat}&toLng=${drop.lng}`,
    )
      .then((r) => !cancelled && setRoute(r))
      .catch(() => {
        // Straight line fallback if even the proxy fails.
        if (!cancelled)
          setRoute({
            distanceKm: 0,
            rideMinutes: 0,
            geometry: [
              [pickup.lng, pickup.lat],
              [drop.lng, drop.lat],
            ],
          });
      });
    return () => {
      cancelled = true;
    };
  }, [pickup.lat, pickup.lng, drop.lat, drop.lng]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [pickup.lng, pickup.lat],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      driverRef.current = null;
    };
  }, [pickup.lat, pickup.lng]);

  // Draw route + endpoint markers once the geometry is known.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;

    const draw = () => {
      if (map.getLayer("route-done")) map.removeLayer("route-done");
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: route.geometry },
        },
      });
      // Faint full route…
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#e8651a", "line-width": 5, "line-opacity": 0.28 },
      });
      // …with a solid "covered" portion drawn on top (updated as progress grows).
      map.addLayer({
        id: "route-done",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#e8651a", "line-width": 5, "line-opacity": 0.95 },
      });
    };
    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);

    // Pickup (green) + drop (orange) pins
    const pins: Marker[] = [];
    pins.push(
      new maplibregl.Marker({ color: "#1ca65c" })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(map),
    );
    pins.push(
      new maplibregl.Marker({ color: "#e8651a" })
        .setLngLat([drop.lng, drop.lat])
        .addTo(map),
    );

    map.fitBounds(
      [
        [Math.min(pickup.lng, drop.lng), Math.min(pickup.lat, drop.lat)],
        [Math.max(pickup.lng, drop.lng), Math.max(pickup.lat, drop.lat)],
      ],
      { padding: 70, maxZoom: 14, duration: 0 },
    );

    return () => pins.forEach((p) => p.remove());
  }, [route, pickup.lat, pickup.lng, drop.lat, drop.lng]);

  // Move the driver marker + trim the "covered" route as progress changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || route.geometry.length < 2) return;

    const pos = pointAlong(route.geometry, phase === "done" ? 1 : Math.max(0, Math.min(1, progress)));

    // Driver marker (custom car bubble)
    if (!driverRef.current) {
      const el = document.createElement("div");
      el.className = "driver-pin";
      el.innerHTML = carSvg();
      driverRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(pos)
        .addTo(map);
    } else {
      driverRef.current.setLngLat(pos);
    }

    // Trim the solid layer to the covered portion.
    const trimToProgress = () => {
      const src = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
      const covered = sliceRoute(route.geometry, phase === "done" ? 1 : progress);
      if (map.getLayer("route-done")) {
        // Re-point the done layer at a covered-only source.
        if (map.getSource("route-covered")) {
          (map.getSource("route-covered") as maplibregl.GeoJSONSource).setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: covered },
          });
        } else {
          map.addSource("route-covered", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: covered },
            },
          });
          map.removeLayer("route-done");
          map.addLayer({
            id: "route-done",
            type: "line",
            source: "route-covered",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#e8651a", "line-width": 5, "line-opacity": 0.95 },
          });
        }
      }
      void src;
    };
    if (map.isStyleLoaded()) trimToProgress();
    else map.once("load", trimToProgress);
  }, [progress, phase, route]);

  return <div ref={containerRef} className="size-full min-h-[260px]" />;
}

// ---- geometry helpers ----

// Haversine distance in metres between two [lng,lat] points.
function dist(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function totalLength(geom: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < geom.length; i++) len += dist(geom[i - 1]!, geom[i]!);
  return len;
}

// Point at fraction `t` (0→1) along the polyline.
function pointAlong(geom: [number, number][], t: number): [number, number] {
  if (geom.length === 1) return geom[0]!;
  const target = totalLength(geom) * t;
  let acc = 0;
  for (let i = 1; i < geom.length; i++) {
    const seg = dist(geom[i - 1]!, geom[i]!);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      const a = geom[i - 1]!;
      const b = geom[i]!;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    acc += seg;
  }
  return geom[geom.length - 1]!;
}

// The portion of the route from the start up to fraction `t`.
function sliceRoute(geom: [number, number][], t: number): [number, number][] {
  if (t <= 0) return [geom[0]!, geom[0]!];
  if (t >= 1) return geom;
  const target = totalLength(geom) * t;
  const out: [number, number][] = [geom[0]!];
  let acc = 0;
  for (let i = 1; i < geom.length; i++) {
    const seg = dist(geom[i - 1]!, geom[i]!);
    if (acc + seg >= target) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      const a = geom[i - 1]!;
      const b = geom[i]!;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      break;
    }
    out.push(geom[i]!);
    acc += seg;
  }
  return out;
}

function carSvg(): string {
  return `
  <span style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:#3d1c00;box-shadow:0 4px 12px rgba(61,28,0,0.4);border:3px solid #fff;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  </span>`;
}
