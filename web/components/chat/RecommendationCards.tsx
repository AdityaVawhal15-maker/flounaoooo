"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Clock, Sparkles, Truck, Utensils, Package, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { AdviceBanner } from "@/components/ui/AdviceBanner";
import { FadeIn } from "@/components/ui/motion";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { rupees } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { FoodQuote, ProductQuote, Recommendation, RideQuote } from "./types";

function FoodQuoteRow({ q, highlight }: { q: FoodQuote; highlight?: boolean }) {
  return (
    <Card
      className={
        highlight
          ? "border-accent/60 shadow-card ring-1 ring-accent/30"
          : "transition-all hover:-translate-y-0.5 hover:shadow-card"
      }
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0">
          <CategoryTile icon={Utensils} theme={highlight ? "orange" : "amber"} size={46} />
        </span>
        <div className="min-w-0 flex-1">
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

// Minimal, ChatGPT/Claude-style result: the AI's answer as clean text, the one
// best pick, and other options tucked behind a toggle.
export function FoodRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "food" }>;
}) {
  const [showMore, setShowMore] = useState(false);
  return (
    <FadeIn y={8} className="flex w-full flex-col gap-2.5">
      <p className="text-[14px] leading-relaxed text-ink">{rec.why}</p>

      {rec.advice && <AdviceBanner advice={rec.advice} />}

      {rec.budgetNote && (
        <p
          className={cn(
            "flex items-center gap-1.5 text-[12px] font-medium",
            rec.budgetNote.startsWith("Heads up") ? "text-danger" : "text-success",
          )}
        >
          <Wallet size={13} className="shrink-0" />
          {rec.budgetNote}
        </p>
      )}

      <FoodQuoteRow q={rec.best} highlight />

      {rec.alternatives.length > 0 && (
        <>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="self-start text-[12px] font-semibold text-accent hover:underline"
          >
            {showMore
              ? "Hide other options"
              : `See ${rec.alternatives.length} other option${rec.alternatives.length === 1 ? "" : "s"}`}
          </button>
          {showMore &&
            rec.alternatives.map((q) => (
              <FoodQuoteRow key={`${q.dishId}-${q.platform}`} q={q} />
            ))}
        </>
      )}
    </FadeIn>
  );
}

function RideQuoteRow({ q }: { q: RideQuote }) {
  return (
    <Card
      className={
        q.badge === "BEST PRICE"
          ? "border-accent/60 shadow-card ring-1 ring-accent/30"
          : "transition-all hover:-translate-y-0.5 hover:shadow-card"
      }
    >
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

// Minimal ride result: clean answer text, the best pick, others behind a toggle.
export function RideRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "ride" }>;
}) {
  const [showMore, setShowMore] = useState(false);
  const [best, ...rest] = rec.quotes;

  return (
    <FadeIn y={8} className="flex w-full flex-col gap-2.5">
      <p className="text-[14px] leading-relaxed text-ink">{rec.why}</p>

      {rec.advice && <AdviceBanner advice={rec.advice} />}

      {best && <RideQuoteRow q={best} />}

      {rest.length > 0 && (
        <>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="self-start text-[12px] font-semibold text-accent hover:underline"
          >
            {showMore
              ? "Hide other options"
              : `See ${rest.length} other option${rest.length === 1 ? "" : "s"}`}
          </button>
          {showMore &&
            rest.map((q) => <RideQuoteRow key={q.productName} q={q} />)}
        </>
      )}
    </FadeIn>
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

function ProductRow({ q, highlight }: { q: ProductQuote; highlight?: boolean }) {
  return (
    <Card
      className={
        highlight
          ? "border-accent/60 shadow-card ring-1 ring-accent/30"
          : "transition-all hover:-translate-y-0.5 hover:shadow-card"
      }
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0">
          <CategoryTile icon={Package} theme="purple" size={46} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            {q.tag}
          </span>
          <p className="mt-1.5 truncate text-[15px] font-bold text-ink">{q.name}</p>
          <p className="truncate text-[12px] text-cocoa">{q.brand}</p>
          <p className="mt-1 flex items-center gap-2 text-[12px] text-cocoa">
            <span className="flex items-center gap-0.5">
              <Star size={12} className="fill-accent text-accent" /> {q.rating}
            </span>
            <span className="flex items-center gap-0.5">
              <Truck size={12} /> {q.deliveryDays}d
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
            href={`/shop/product/${q.productId}?platform=${q.platform}`}
            className="mt-2 inline-block rounded-pill bg-accent px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d4570f] transition-colors"
          >
            View deal
          </Link>
        </div>
      </div>
    </Card>
  );
}

export function ShopRecommendation({
  rec,
}: {
  rec: Extract<Recommendation, { type: "shop" }>;
}) {
  return (
    <FadeIn y={8} className="flex w-full flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
        <Sparkles size={13} /> Radiues pick
      </p>
      <ProductRow q={rec.best} highlight />
      <p className="text-[12px] leading-relaxed text-cocoa">{rec.why}</p>
      <p className="text-[12px] italic text-cocoa/80">“{rec.best.reviewSummary}”</p>
      {rec.alternatives.length > 0 && (
        <>
          <p className="mt-1 text-[12px] font-semibold text-cocoa">
            Other places to buy
          </p>
          {rec.alternatives.map((q) => (
            <ProductRow key={`${q.productId}-${q.platform}`} q={q} />
          ))}
        </>
      )}
    </FadeIn>
  );
}
