"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
// MapTiler when configured; otherwise the free MapLibre demo style.
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : "https://demotiles.maplibre.org/style.json";

export type LatLng = { lat: number; lng: number };

export function RideMap({
  pickup,
  drop,
  routeGeometry,
  onPick,
}: {
  pickup: LatLng | null;
  drop: LatLng | null;
  routeGeometry: [number, number][] | null;
  // Set while the user is choosing a point by tapping the map. Kept in a ref
  // so toggling it doesn't tear the map down and rebuild it.
  onPick?: ((p: LatLng) => void) | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [78.4747, 17.385], // Hyderabad
      zoom: 11,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => {
      onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keep the click handler current, and show a crosshair while picking so the
  // map reads as interactive.
  useEffect(() => {
    onPickRef.current = onPick;
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = onPick ? "crosshair" : "";
  }, [onPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const addMarker = (point: LatLng, color: string) => {
      const marker = new maplibregl.Marker({ color })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markersRef.current.push(marker);
    };
    if (pickup) addMarker(pickup, "#1ca65c");
    if (drop) addMarker(drop, "#e8651a");

    const drawRoute = () => {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
      if (!routeGeometry || routeGeometry.length < 2) return;
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeGeometry },
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#e8651a",
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });
    };
    if (map.isStyleLoaded()) drawRoute();
    else map.once("load", drawRoute);

    if (pickup && drop) {
      map.fitBounds(
        [
          [Math.min(pickup.lng, drop.lng), Math.min(pickup.lat, drop.lat)],
          [Math.max(pickup.lng, drop.lng), Math.max(pickup.lat, drop.lat)],
        ],
        { padding: 60, maxZoom: 14 },
      );
    } else if (pickup || drop) {
      const p = (pickup ?? drop)!;
      map.flyTo({ center: [p.lng, p.lat], zoom: 13 });
    }
  }, [pickup, drop, routeGeometry]);

  return <div ref={containerRef} className="size-full min-h-[260px]" />;
}
