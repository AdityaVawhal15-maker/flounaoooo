"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LocateFixed, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : "https://demotiles.maplibre.org/style.json";

export type ResolvedAddress = {
  line1: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  formatted: string;
};

export type PickedLocation = {
  lat: number;
  lng: number;
  address: ResolvedAddress;
};

// Map-first location picker. The pin is fixed to the centre of the frame and
// the map moves underneath it — the pattern every delivery app uses, because
// it works with one thumb and never asks you to hit a small target. Each
// settle reverse-geocodes so the caller can auto-fill an address form.
export function LocationPicker({
  initial,
  onChange,
  height = 220,
  className,
}: {
  initial?: { lat: number; lng: number } | null;
  onChange: (picked: PickedLocation) => void;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const onChangeRef = useRef(onChange);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [label, setLabel] = useState("Move the map to set your location");
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Reverse-geocode the current centre and hand the parts back up.
  const resolve = useCallback(async (lat: number, lng: number) => {
    setResolving(true);
    setError("");
    try {
      const d = await api<{ address: ResolvedAddress }>(
        `/api/rides/reverse?lat=${lat}&lng=${lng}`,
      );
      const address = d.address;
      setLabel(address.formatted || "Pinned location");
      onChangeRef.current({ lat, lng, address });
    } catch {
      // Keep the coordinates usable even if naming failed — the user can type
      // the address themselves rather than being blocked.
      setLabel("Couldn't name this spot — you can type it below");
      onChangeRef.current({
        lat,
        lng,
        address: { line1: "", area: "", city: "", state: "", pincode: "", formatted: "" },
      });
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = initial ?? { lat: 17.385, lng: 78.4867 }; // Hyderabad
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [start.lng, start.lat],
      zoom: initial ? 16 : 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Only resolve once the map settles, so dragging doesn't spam the geocoder.
    map.on("moveend", () => {
      const c = map.getCenter();
      void resolve(c.lat, c.lng);
    });
    mapRef.current = map;
    // Name the starting pin once the map is ready (an event callback, so this
    // never sets state synchronously during the effect).
    if (initial) {
      map.once("idle", () => void resolve(initial.lat, initial.lng));
    }
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Mount once — `initial` is a starting position, not a live binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        // flyTo triggers moveend, which resolves the address.
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, duration: 800 });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — check browser permissions");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-card border border-line"
        style={{ height }}
      >
        <div ref={containerRef} className="size-full" />

        {/* Fixed centre pin — the map moves under it. Slightly above centre so
            the point sits at the tip, not the middle of the icon. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"
        >
          <MapPin
            size={34}
            className="fill-accent text-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Use my location — the primary way in. Top-left: the bottom edge is
            taken by the map attribution, which this used to overlap. */}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute left-3 top-3 flex items-center gap-1.5 rounded-pill bg-card px-3.5 py-2 text-[12px] font-semibold text-accent shadow-card transition-colors hover:bg-beige/60 disabled:opacity-60"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LocateFixed size={14} />
          )}
          {locating ? "Locating…" : "Use my current location"}
        </button>
      </div>

      {/* Resolved address readout */}
      <div className="mt-2 flex items-start gap-2 px-0.5">
        <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
        <p
          className={cn(
            "min-w-0 flex-1 text-[12px] leading-relaxed",
            resolving ? "text-cocoa/60" : "text-cocoa",
          )}
        >
          {resolving ? "Finding your address…" : label}
        </p>
      </div>
      {error && <p className="mt-1 px-0.5 text-[12px] text-danger">{error}</p>}
    </div>
  );
}
