"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, MapPin, Loader2, Check, Search } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AdviceBanner } from "@/components/ui/AdviceBanner";
import { useRideBooking, VEHICLES, type Vehicle } from "@/lib/rides/useRideBooking";

// Booking a ride without leaving the conversation.
//
// The old card ended at a Select button that pushed you to /rides, where you
// re-stated a destination you had already typed and started the flow again.
// This is that flow, in the thread: a map you can tap, both endpoints, the
// vehicle, live quotes, and confirm.
//
// It runs on the same hook the rides page runs on, so there is exactly one
// booking machine. Anything this card could do differently would be a way for
// the two to disagree about a fare.
//
// The map is deliberately short. It is a step in a conversation, not the
// screen, and a map tall enough to feel like the rides page would push the
// answer and the composer off a phone.

const RideMap = dynamic(
  () => import("@/components/rides/RideMap").then((m) => m.RideMap),
  {
    ssr: false,
    loading: () => <div className="h-[190px] animate-pulse rounded-2xl bg-beige/50" />,
  },
);

const VEHICLE_LABEL: Record<Vehicle, string> = {
  any: "Any",
  bike: "Bike",
  auto: "Auto",
  cab: "Cab",
};

export function InlineRideBooking({
  drop,
  vehicle,
  scheduledAt,
  onBooked,
}: {
  /** Destination the chat already understood, resolved on open. */
  drop?: string | null;
  vehicle?: Vehicle;
  scheduledAt?: string | null;
  /** Handed the new order id so the thread can move on to payment. */
  onBooked: (orderId: string) => void;
}) {
  const b = useRideBooking({
    initialDrop: drop ?? null,
    initialVehicle: vehicle ?? "any",
    initialScheduledAt: scheduledAt ?? null,
  });
  const [confirming, setConfirming] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ name: string; area: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  // Debounced so a four-word destination is one lookup, not four. The sequence
  // number is what stops a slow early request landing after a fast later one
  // and replacing the right answer with a stale one.
  useEffect(() => {
    const q = query.trim();
    // Returns without clearing: results are hidden by deriving them below
    // rather than by writing state during the effect, which React 19 rejects
    // and which would re-render every keystroke of the first two letters.
    if (!b.picking || q.length < 3) return;
    const mine = ++seq.current;
    const id = setTimeout(() => {
      // Moved inside the timer: setting it synchronously would flash the
      // spinner on every keystroke, including ones the debounce discards.
      setSearching(true);
      api<{ places: { name: string; area: string; lat: number; lng: number }[] }>(
        `/api/rides/geocode?q=${encodeURIComponent(q)}`,
      )
        .then((d) => {
          if (mine !== seq.current) return;
          setHits(d.places.slice(0, 5));
        })
        .catch(() => mine === seq.current && setHits([]))
        .finally(() => mine === seq.current && setSearching(false));
    }, 350);
    return () => clearTimeout(id);
  }, [query, b.picking]);

  // Stale results from a previous endpoint or a since-shortened query are
  // simply not shown, rather than being cleared out of state on the way past.
  const visibleHits = b.picking && query.trim().length >= 3 ? hits : [];

  function choose(place: { name: string; area: string; lat: number; lng: number }) {
    if (b.picking === "pickup") b.setPickup(place);
    else b.setDrop(place);
    b.setPicking(null);
    setQuery("");
    setHits([]);
  }

  async function confirm() {
    setConfirming(true);
    const id = await b.confirm();
    setConfirming(false);
    if (id) onBooked(id);
  }

  const endpoint = (
    which: "pickup" | "drop",
    place: { name: string; area: string } | null,
  ) => {
    const active = b.picking === which;
    return (
      <button
        type="button"
        onClick={() => b.setPicking(active ? null : which)}
        className={cn(
          "tap-target flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
          active ? "border-accent bg-accent-soft/40" : "border-line bg-card",
        )}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            which === "pickup" ? "bg-success" : "bg-accent",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">
            {place?.name ?? (which === "pickup" ? "Pickup" : "Where to?")}
          </span>
          {place?.area && (
            <span className="block truncate text-[11px] text-cocoa">{place.area}</span>
          )}
        </span>
        {/* Says what tapping the map will now do, rather than leaving the
            person to discover that the map became interactive. */}
        {active && (
          <span className="shrink-0 text-[11px] font-semibold text-accent">
            tap the map
          </span>
        )}
        {which === "pickup" && !active && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Use my current location"
            onClick={(e) => {
              e.stopPropagation();
              b.detectPickup();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                b.detectPickup();
              }
            }}
            className="shrink-0 rounded-full p-1.5 text-cocoa hover:bg-beige"
          >
            {b.locating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Crosshair size={15} />
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="w-full rounded-card border border-line bg-card p-3.5 shadow-soft">
      <div className="overflow-hidden rounded-2xl">
        <div className="h-[190px]">
          <RideMap
            pickup={b.mapPoints.pickup}
            drop={b.mapPoints.drop}
            routeGeometry={b.route?.geometry ?? null}
            onPick={b.picking ? b.pickOnMap : null}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {endpoint("pickup", b.pickup)}
        {endpoint("drop", b.drop)}
      </div>

      {/* Typing, for when the map is not the easiest way to say where you are.
          Shown only while an endpoint is being chosen, so it is an answer to a
          question currently being asked rather than a permanent field. */}
      {b.picking && (
        <div className="mt-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-cream px-3 py-2.5">
            <Search size={15} className="shrink-0 text-cocoa" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder={
                b.picking === "pickup" ? "Search for a pickup point" : "Search for a destination"
              }
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-cocoa/60"
            />
            {searching && <Loader2 size={14} className="shrink-0 animate-spin text-cocoa" />}
          </div>
          {visibleHits.length > 0 && (
            <ul className="mt-1.5 overflow-hidden rounded-xl border border-line">
              {visibleHits.map((h) => (
                <li key={`${h.name}-${h.lat}-${h.lng}`}>
                  <button
                    type="button"
                    onClick={() => choose(h)}
                    className="tap-target flex w-full items-start gap-2 border-b border-line/70 bg-card px-3 py-2.5 text-left last:border-0 hover:bg-beige/40"
                  >
                    <MapPin size={13} className="mt-0.5 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {h.name}
                      </span>
                      <span className="block truncate text-[11px] text-cocoa">{h.area}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Saved places, offered only while an endpoint is being chosen, so they
          are an answer to a question the person is currently being asked. */}
      {b.picking && b.saved.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {b.saved.map((p) => (
            <button
              key={`${p.name}-${p.lat}`}
              type="button"
              onClick={() => choose(p)}
              className="tap-target flex items-center gap-1 rounded-pill border border-line px-2.5 py-1.5 text-[12px] text-cocoa hover:bg-beige/50"
            >
              <MapPin size={11} className="text-accent" />
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        {VEHICLES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => b.setVehicle(v)}
            className={cn(
              "tap-target flex-1 rounded-pill border px-2 py-2 text-[12px] font-semibold transition-colors",
              b.vehicle === v
                ? "border-accent bg-accent text-white"
                : "border-line text-cocoa hover:bg-beige/50",
            )}
          >
            {VEHICLE_LABEL[v]}
          </button>
        ))}
      </div>

      {b.route && (
        <p className="mt-2.5 text-[12px] text-cocoa">
          {b.route.distanceKm.toFixed(1)} km · about {b.route.rideMinutes} min
        </p>
      )}

      {b.advice && (
        <div className="mt-2.5">
          <AdviceBanner advice={b.advice} />
        </div>
      )}

      {b.quotes.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {b.quotes.map((q) => {
            const on = b.selected?.productName === q.productName;
            return (
              <button
                key={`${q.provider}-${q.productName}`}
                type="button"
                onClick={() => b.setSelected(q)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                  on ? "border-accent bg-accent-soft/30" : "border-line hover:bg-beige/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-accent bg-accent" : "border-line",
                  )}
                >
                  {on && <Check size={11} className="text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {q.displayName}
                  </span>
                  <span className="block text-[11px] text-cocoa">
                    {q.pickupEtaMinutes} min away
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-bold text-ink">
                  {rupees(q.effectivePaise)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {b.error && (
        <p role="alert" className="mt-2.5 text-[12px] text-danger">
          {b.error}
        </p>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!b.ready || confirming || b.busy}
        className="tap-target mt-3 w-full rounded-pill bg-accent px-4 py-3 text-[14px] font-bold text-white transition-opacity disabled:opacity-50"
      >
        {confirming
          ? "Booking…"
          : b.selected
            ? `Book ${b.selected.displayName} · ${rupees(b.selected.effectivePaise)}`
            : b.pickup && b.drop
              ? "Getting prices…"
              : "Set pickup and destination"}
      </button>
    </div>
  );
}
