"use client";

import Link from "next/link";
import { Star, Clock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AdviceBanner } from "@/components/ui/AdviceBanner";
import { rupees } from "@/lib/money";
import type { FoodQuote, Recommendation, RideQuote } from "./types";

function FoodQuoteRow({ q, highlight }: { q: FoodQuote; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-accent/60 ring-1 ring-accent/30" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            {q.tag}
          </span>
          <p className="mt-1.5 truncate text-[15px] font-bold text-ink">{q.name}</p>
          <p className="truncate text-[12px] text-cocoa">{q.restaurant}</p>
          <p className="mt-1 flex items-center gap-2 text-[12px] text-cocoa">
            <span className="flex items-center gap-0.5">
              <Star size={12} className="fill-accent text-accent" /> {q.rating}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock size={12} /> {q.etaMinutes} min
            </span>
            <span className="uppercase">{q.platform}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-bold text-ink">{rupees(q.effectivePaise)}</p>
          {q.offers.length > 0 && (
            <p className="text-[11px] text-success">{q.offers[0].label}</p>
          )}
          <Link
            href={`/food/order/${q.dishId}?platform=${q.platform}`}
            className="mt-2 inline-block rounded-pill bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d4570f] transition-colors"
          >
            {q.fulfillment === "in_app" ? "Order now" : `Order on ${q.platform}`}
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function FoodRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "food" }>;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
        <Sparkles size={13} /> Radiues pick
      </p>
      <FoodQuoteRow q={rec.best} highlight />
      {rec.advice && <AdviceBanner advice={rec.advice} />}
      <p className="text-[12px] leading-relaxed text-cocoa">{rec.why}</p>
      <p className="text-[12px] italic text-cocoa/80">“{rec.best.reviewSummary}”</p>
      {rec.alternatives.length > 0 && (
        <>
          <p className="mt-1 text-[12px] font-semibold text-cocoa">
            Options we think you&apos;ll like
          </p>
          {rec.alternatives.map((q) => (
            <FoodQuoteRow key={`${q.dishId}-${q.platform}`} q={q} />
          ))}
        </>
      )}
    </div>
  );
}

function RideQuoteRow({ q }: { q: RideQuote }) {
  return (
    <Card className={q.badge === "BEST PRICE" ? "border-accent/60 ring-1 ring-accent/30" : ""}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
            {q.productName}
            {q.badge && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                {q.badge}
              </span>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-[12px] text-cocoa">
            <span className="flex items-center gap-0.5">
              <Clock size={12} /> {q.pickupEtaMinutes} min away
            </span>
            <span className="flex items-center gap-0.5">
              <Star size={12} className="fill-accent text-accent" /> {q.driverRating}
            </span>
          </p>
          {q.offers[0] && (
            <p className="text-[11px] text-success">{q.offers[0].label}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-bold text-ink">{rupees(q.effectivePaise)}</p>
          <Link
            href="/rides"
            className="mt-1.5 inline-block rounded-pill bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d4570f] transition-colors"
          >
            Select
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function RideRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "ride" }>;
}) {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
        <Sparkles size={13} /> Rides to {rec.drop}
      </p>
      {rec.advice && <AdviceBanner advice={rec.advice} />}
      {rec.quotes.map((q) => (
        <RideQuoteRow key={q.productName} q={q} />
      ))}
      <p className="text-[12px] leading-relaxed text-cocoa">{rec.why}</p>
    </div>
  );
}

export function ComboRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "combo" }>;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
        <Sparkles size={14} className="text-accent" /> Your evening, sorted —
        food + ride in one go
      </p>
      {rec.food && (
        <div className="rounded-card border border-line/70 p-3">
          <FoodRecommendation rec={{ type: "food", ...rec.food }} />
        </div>
      )}
      <div className="rounded-card border border-line/70 p-3">
        <RideRecommendation rec={{ type: "ride", ...rec.ride }} />
      </div>
    </div>
  );
}
