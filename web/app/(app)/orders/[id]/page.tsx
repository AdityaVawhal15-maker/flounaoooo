"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle, Receipt, ChevronLeft, Navigation } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { DecisionReceipt } from "@/components/orders/DecisionReceipt";
import { cn } from "@/lib/cn";

const LiveTrackingMap = dynamic(
  () => import("@/components/orders/LiveTrackingMap").then((m) => m.LiveTrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-card bg-beige/50" />,
  },
);

type TrackingEvent = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
};

type OrderDetail = {
  id: string;
  domain: "food" | "ride";
  status: string;
  provider: string;
  title: string;
  amount: number;
  savedPaise: number;
  createdAt: string;
  details: {
    basePaise?: number;
    deliveryFeePaise?: number;
    offers?: { label: string; discountPaise: number }[];
    farePaise?: number;
    pickup?: string;
    drop?: string;
    pickupLat?: number;
    pickupLng?: number;
    dropLat?: number;
    dropLng?: number;
    comparedOptions?: number;
    comparedPlatforms?: number;
  };
  trackingEvents: TrackingEvent[];
  payment: { status: string; method: string | null } | null;
};

const POLL_MS = 15_000;

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const search = useSearchParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const load = () =>
      api<{ order: OrderDetail }>(`/api/orders/${id}`)
        .then((d) => setOrder(d.order))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    load();
    const fetchTimer = setInterval(load, POLL_MS);
    // A faster local clock advances the driver marker smoothly between fetches.
    const tickTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(fetchTimer);
      clearInterval(tickTimer);
    };
  }, [id]);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[14px] text-cocoa">{error || "Loading…"}</p>
      </div>
    );
  }

  // Events are seeded with future timestamps — only "reached" ones count.
  const reached = order.trackingEvents.filter(
    (e) => new Date(e.createdAt).getTime() <= now,
  );
  const allDone =
    order.status === "completed" ||
    (order.trackingEvents.length > 0 && reached.length === order.trackingEvents.length);
  const showInvoice = search.get("invoice") === "1";

  // Live ride tracking: drive a map marker from pickup→drop across the span of
  // the tracking timeline. Progress = how far "now" is between the first and
  // last event time. Driver is "arriving" until the 2nd-to-last event, then
  // "enroute" to the drop.
  const d = order.details;
  const hasRideCoords =
    order.domain === "ride" &&
    d.pickupLat != null &&
    d.pickupLng != null &&
    d.dropLat != null &&
    d.dropLng != null;

  let tripProgress = 0;
  let tripPhase: "arriving" | "enroute" | "done" = "arriving";
  if (hasRideCoords && order.trackingEvents.length >= 2) {
    const times = order.trackingEvents.map((e) => new Date(e.createdAt).getTime());
    const start = times[0]!;
    const end = times[times.length - 1]!;
    const span = Math.max(1, end - start);
    const raw = (now - start) / span;
    tripProgress = Math.max(0, Math.min(1, raw));
    if (allDone) tripPhase = "done";
    else if (reached.length >= order.trackingEvents.length - 1) tripPhase = "enroute";
    else tripPhase = "arriving";
  }

  // Minutes until the final tracking event (driver's ETA).
  const lastEventTime =
    order.trackingEvents.length > 0
      ? new Date(order.trackingEvents[order.trackingEvents.length - 1]!.createdAt).getTime()
      : 0;
  const etaMinutes = Math.max(0, Math.ceil((lastEventTime - now) / 60000));

  const discount =
    order.details.offers?.reduce((s, o) => s + o.discountPaise, 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 lg:px-6">
      <Link
        href="/history"
        className="flex items-center gap-1 text-[13px] font-medium text-cocoa hover:text-ink"
      >
        <ChevronLeft size={16} /> History
      </Link>

      <h1 className="mt-3 text-[19px] font-bold text-ink">{order.title}</h1>
      <p className="mt-0.5 text-[12px] uppercase text-cocoa">
        {order.provider} · {new Date(order.createdAt).toLocaleString("en-IN")}
      </p>

      {/* Live ride map */}
      {hasRideCoords && (
        <Card className="mt-5 overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft">
                <Navigation size={15} className="text-accent" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink">
                  {tripPhase === "done"
                    ? "Trip completed"
                    : tripPhase === "enroute"
                      ? `On the way to ${d.drop ?? "your drop"}`
                      : "Driver is arriving"}
                </p>
                <p className="text-[11px] text-cocoa">
                  {tripPhase === "done"
                    ? "Hope you enjoyed the ride"
                    : etaMinutes > 0
                      ? `${etaMinutes} min away`
                      : "Arriving now"}
                </p>
              </div>
            </div>
            {tripPhase !== "done" && (
              <span className="flex items-center gap-1.5 rounded-pill bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                Live
              </span>
            )}
          </div>
          <div className="h-[280px] w-full">
            <LiveTrackingMap
              pickup={{ lat: d.pickupLat!, lng: d.pickupLng! }}
              drop={{ lat: d.dropLat!, lng: d.dropLng! }}
              progress={tripProgress}
              phase={tripPhase}
            />
          </div>
        </Card>
      )}

      {/* Tracking timeline */}
      {order.trackingEvents.length > 0 && (
        <Card className="mt-5">
          <h2 className="text-[14px] font-bold text-ink">
            {allDone
              ? order.domain === "food"
                ? "Delivered"
                : "Trip completed"
              : order.domain === "food"
                ? "Tracking your order"
                : "Tracking your ride"}
          </h2>
          <div className="mt-3 flex flex-col">
            {order.trackingEvents.map((e, i) => {
              const isReached = new Date(e.createdAt).getTime() <= now;
              const isLast = i === order.trackingEvents.length - 1;
              return (
                <div key={e.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {isReached ? (
                      <CheckCircle2 size={18} className="shrink-0 text-success" />
                    ) : (
                      <Circle size={18} className="shrink-0 text-line" />
                    )}
                    {!isLast && (
                      <span
                        className={cn(
                          "w-px flex-1",
                          isReached ? "bg-success/50" : "bg-line",
                        )}
                      />
                    )}
                  </div>
                  <div className={cn("pb-5", !isReached && "opacity-50")}>
                    <p className="text-[13px] font-semibold text-ink">{e.message}</p>
                    <p className="text-[11px] text-cocoa">
                      {new Date(e.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {order.details.comparedOptions !== undefined && (
        <div className="mt-4">
          <DecisionReceipt
            comparedOptions={order.details.comparedOptions}
            comparedPlatforms={order.details.comparedPlatforms ?? 1}
            savedPaise={order.savedPaise}
            domain={order.domain}
            title={order.title}
          />
        </div>
      )}

      {/* Invoice */}
      <Card className={cn("mt-4", showInvoice && "border-accent/60 ring-1 ring-accent/30")}>
        <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <Receipt size={15} className="text-cocoa" /> Invoice
        </h2>
        <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
          {order.domain === "food" ? (
            <>
              <Row label="Item total" value={rupees(order.details.basePaise ?? order.amount)} />
              {order.details.deliveryFeePaise !== undefined && (
                <Row label="Delivery fee" value={rupees(order.details.deliveryFeePaise)} />
              )}
            </>
          ) : (
            <>
              {order.details.pickup && (
                <Row label="Pickup" value={order.details.pickup} />
              )}
              {order.details.drop && <Row label="Drop" value={order.details.drop} />}
              <Row label="Base fare" value={rupees(order.details.farePaise ?? order.amount)} />
            </>
          )}
          {discount > 0 && <Row label="Offers" value={`− ${rupees(discount)}`} accent />}
          <div className="my-1.5 h-px bg-line" />
          <Row label="Total paid" value={rupees(order.amount)} bold />
          {order.savedPaise > 0 && (
            <Row
              label="You saved vs next-best option"
              value={rupees(order.savedPaise)}
              accent
            />
          )}
          <Row
            label="Payment"
            value={
              order.payment
                ? `${order.payment.method?.toUpperCase() ?? "—"} · ${order.payment.status}`
                : "—"
            }
          />
          <Row label="Order ID" value={order.id} mono />
        </div>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
  mono,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-cocoa">{label}</span>
      <span
        className={cn(
          "text-right text-ink",
          bold && "text-[15px] font-bold",
          accent && "font-medium text-success",
          mono && "break-all font-mono text-[11px] text-cocoa",
        )}
      >
        {value}
      </span>
    </div>
  );
}
