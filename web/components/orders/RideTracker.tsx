"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Phone, Star, ShieldCheck, Navigation, Copy, Check, Share2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/ui/motion";
import { useI18n } from "@/components/i18n/I18nContext";

const LiveTrackingMap = dynamic(
  () => import("./LiveTrackingMap").then((m) => m.LiveTrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse bg-beige/50" />,
  },
);

type LatLng = { lat: number; lng: number };

type Driver = {
  name: string;
  phoneMasked: string;
  rating: number;
  trips: number;
  photoUrl: string | null;
  vehicle: { type: "bike" | "auto" | "cab"; model: string; plate: string; color: string };
};

type Tracking = {
  providerRef: string;
  state: "searching" | "assigned" | "arriving" | "arrived" | "in_progress" | "completed" | "cancelled";
  otp: string;
  driver: Driver | null;
  driverLocation: LatLng | null;
  pickupEtaMinutes: number;
  dropEtaMinutes: number;
  statusMessage: string;
};

const POLL_MS = 4000;

// Live ride tracking — driver card, OTP, and a moving map. Free for everyone.
export function RideTracker({
  orderId,
  pickup,
  drop,
  dropLabel,
  domain = "ride",
}: {
  orderId: string;
  pickup: LatLng;
  drop: LatLng;
  dropLabel: string;
  domain?: "ride" | "food";
}) {
  const isFood = domain === "food";
  const { t: tr } = useI18n();
  const [t, setT] = useState<Tracking | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let stop = false;
    const load = () =>
      api<{ tracking: Tracking }>(`/api/orders/${orderId}/track`)
        .then((d) => !stop && setT(d.tracking))
        .catch(() => {});
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => {
      stop = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [orderId]);

  // Stop polling once the trip reaches a terminal state.
  useEffect(() => {
    if ((t?.state === "completed" || t?.state === "cancelled") && timer.current)
      clearInterval(timer.current);
  }, [t?.state]);

  const done = t?.state === "completed";
  const cancelled = t?.state === "cancelled";
  const searching = !t || t.state === "searching";
  // Cancellable while the ride is live (not searching's first beat, not done).
  const canCancel = Boolean(t) && !done && !cancelled;

  async function cancelRide() {
    setCancelling(true);
    try {
      await api(`/api/orders/${orderId}/cancel`, { method: "POST", json: {} });
      const d = await api<{ tracking: Tracking }>(`/api/orders/${orderId}/track`);
      setT(d.tracking);
      setConfirmCancel(false);
    } catch {
      // leave the tracker as-is; user can retry
    } finally {
      setCancelling(false);
    }
  }

  async function shareTrip() {
    const url = `${window.location.origin}/orders/${orderId}`;
    const text = tr("track.shareText");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Radiues", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <FadeIn y={10}>
      <Card className="overflow-hidden p-0">
        {/* Status header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft">
              <Navigation size={15} className="text-accent" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">
                {cancelled
                  ? tr("track.cancelled")
                  : done
                    ? tr("track.completed")
                    : t?.state === "in_progress"
                      ? `${tr("track.onTheWay")} · ${dropLabel}`
                      : t?.state === "arrived"
                        ? tr("track.arrived")
                        : searching
                          ? isFood
                            ? "Finding a delivery partner…"
                            : tr("track.searching")
                          : tr("track.onTheWay")}
              </p>
              <p className="text-[11px] text-cocoa">
                {cancelled
                  ? tr("track.cancelledSub")
                  : done
                    ? tr("track.enjoyed")
                    : t?.state === "in_progress"
                      ? `${t.dropEtaMinutes} ${tr("track.minToDrop")}`
                      : t && t.pickupEtaMinutes > 0
                        ? `${t.pickupEtaMinutes} ${tr("track.minAway")}`
                        : t?.statusMessage ?? "…"}
              </p>
            </div>
          </div>
          {!done && !cancelled && (
            <span className="flex items-center gap-1.5 rounded-pill bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" /> {tr("track.live")}
            </span>
          )}
        </div>

        {/* Map */}
        <div className="h-[280px] w-full border-y border-line">
          <LiveTrackingMap
            pickup={pickup}
            drop={drop}
            driverLocation={t?.driverLocation ?? null}
            done={Boolean(done)}
          />
        </div>

        {/* Searching shimmer or driver card */}
        {searching ? (
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 animate-pulse rounded-full bg-beige" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-beige" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-beige" />
              </div>
            </div>
            {canCancel && (
              <button
                onClick={() => (confirmCancel ? cancelRide() : setConfirmCancel(true))}
                disabled={cancelling}
                className="mt-3 w-full rounded-pill border border-danger/40 bg-card py-2.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-60"
              >
                {cancelling
                  ? tr("track.cancelling")
                  : confirmCancel
                    ? tr("track.confirmCancel")
                    : tr("track.cancelRide")}
              </button>
            )}
          </div>
        ) : cancelled ? null : (
          t?.driver && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-[18px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#ff8a4c,#e8651a)" }}
                >
                  {t.driver.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
                    {t.driver.name}
                    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-cocoa">
                      <Star size={11} className="fill-accent text-accent" />
                      {t.driver.rating.toFixed(1)}
                    </span>
                  </p>
                  <p className="truncate text-[12px] text-cocoa">
                    {t.driver.vehicle.color} {t.driver.vehicle.model} ·{" "}
                    {t.driver.trips.toLocaleString("en-IN")} {tr("track.trips")}
                  </p>
                </div>
                {/* Number plate */}
                <span className="shrink-0 rounded-md border border-line bg-beige/60 px-2 py-1 text-[12px] font-bold tracking-wide text-ink">
                  {t.driver.vehicle.plate}
                </span>
              </div>

              {/* OTP + call row */}
              {!done && (
                <div className="mt-3 flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(t.otp).then(
                        () => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        },
                        () => {},
                      );
                    }}
                    className="flex flex-1 items-center justify-between rounded-card border border-accent/40 bg-accent-soft/60 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cocoa">
                      <ShieldCheck size={13} className="text-accent" /> {tr("track.startOtp")}
                    </span>
                    <span className="flex items-center gap-1.5 text-[18px] font-bold tracking-[0.2em] text-ink">
                      {t.otp}
                      {copied ? (
                        <Check size={14} className="text-success" />
                      ) : (
                        <Copy size={13} className="text-cocoa/60" />
                      )}
                    </span>
                  </button>
                  <a
                    href="tel:"
                    onClick={(e) => e.preventDefault()}
                    title={t.driver.phoneMasked}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105"
                  >
                    <Phone size={17} />
                  </a>
                </div>
              )}

              {/* Share + Cancel actions */}
              {(canCancel || done) && (
                <div className="mt-2.5 flex items-center gap-2.5">
                  <button
                    onClick={shareTrip}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-line bg-card py-2.5 text-[12px] font-semibold text-ink transition-colors hover:bg-beige/40"
                  >
                    <Share2 size={14} className="text-accent" /> {tr("track.share")}
                  </button>
                  {canCancel &&
                    (confirmCancel ? (
                      <div className="flex flex-1 items-center gap-2">
                        <button
                          onClick={cancelRide}
                          disabled={cancelling}
                          className="flex-1 rounded-pill bg-danger py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#c0392b] disabled:opacity-60"
                        >
                          {cancelling ? tr("track.cancelling") : tr("track.confirmCancel")}
                        </button>
                        <button
                          onClick={() => setConfirmCancel(false)}
                          disabled={cancelling}
                          className="rounded-pill border border-line bg-card px-3 py-2.5 text-[12px] font-semibold text-cocoa"
                        >
                          {tr("track.keepRide")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCancel(true)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-danger/40 bg-card py-2.5 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/5"
                      >
                        <X size={14} /> {tr("track.cancelRide")}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )
        )}
      </Card>
    </FadeIn>
  );
}
