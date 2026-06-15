"use client";

import { use, useEffect, useState } from "react";
import { Star, Truck, BadgePercent, ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { ProductQuote } from "@/components/chat/types";

export default function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  const [quotes, setQuotes] = useState<ProductQuote[]>([]);
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ quotes: ProductQuote[] }>(`/api/shop/products/${productId}`)
      .then((d) => {
        setQuotes(d.quotes);
        setPlatform(d.quotes[0]?.platform ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [productId]);

  const selected = quotes.find((q) => q.platform === platform);

  if (!selected) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[14px] text-cocoa">{error || "Loading…"}</p>
      </div>
    );
  }

  const discount = selected.offers.reduce((s, o) => s + o.discountPaise, 0);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 lg:px-6">
      <Link
        href="/shop"
        className="flex items-center gap-1 text-[13px] font-medium text-cocoa hover:text-ink"
      >
        <ChevronLeft size={16} /> Shop
      </Link>

      <h1 className="mt-3 text-[20px] font-bold text-ink">{selected.name}</h1>
      <p className="text-[13px] text-cocoa">{selected.brand}</p>
      <p className="mt-1 flex items-center gap-3 text-[12px] text-cocoa">
        <span className="flex items-center gap-0.5">
          <Star size={12} className="fill-accent text-accent" /> {selected.rating} (
          {selected.reviews.toLocaleString("en-IN")})
        </span>
      </p>

      <p className="mt-4 text-[12px] italic leading-relaxed text-cocoa">
        “{selected.reviewSummary}”
      </p>

      {/* Platform comparison */}
      <h2 className="mt-6 text-[14px] font-bold text-ink">Compare across stores</h2>
      <div className="mt-2 flex flex-col gap-2">
        {quotes.map((q) => (
          <button key={q.platform} onClick={() => setPlatform(q.platform)} className="text-left">
            <Card
              className={cn(
                "transition-colors",
                q.platform === platform && "border-accent/70 ring-1 ring-accent/30",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold uppercase text-ink">{q.platform}</p>
                  <p className="flex items-center gap-1 text-[12px] text-cocoa">
                    <Truck size={12} /> {q.deliveryDays}-day delivery
                  </p>
                  {q.offers[0] && (
                    <p className="flex items-center gap-1 text-[12px] text-success">
                      <BadgePercent size={12} /> {q.offers[0].label}
                    </p>
                  )}
                </div>
                <p className="text-[17px] font-bold text-ink">{rupees(q.effectivePaise)}</p>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* Coupons */}
      <Card className="mt-4">
        <p className="text-[13px] font-bold text-ink">Coupons we found</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["WELCOME100", "HDFC10"].map((code) => (
            <span
              key={code}
              className="rounded-lg border border-dashed border-accent/50 bg-accent-soft/40 px-2.5 py-1 text-[12px] font-semibold text-accent"
            >
              {code}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-cocoa">
          Best applicable offer is already reflected in the price above.
        </p>
      </Card>

      {/* Bill */}
      <Card className="mt-4">
        <Row label="List price" value={rupees(selected.basePaise)} />
        {discount > 0 && <Row label="Offers" value={`− ${rupees(discount)}`} accent />}
        <div className="my-2 h-px bg-line" />
        <Row label="Effective price" value={rupees(selected.effectivePaise)} bold />
      </Card>

      {/* E-commerce is redirect-fulfilled — we hand off to the platform. */}
      <Button className="mt-5 w-full" onClick={() => {}}>
        <ExternalLink size={16} /> Buy on {selected.platform}
      </Button>
      <p className="mt-3 text-center text-[11px] text-cocoa/70">
        Radiues redirects you to {selected.platform} with the best offer pre-applied.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-[13px]", bold ? "font-bold text-ink" : "text-cocoa")}>
        {label}
      </span>
      <span
        className={cn(
          "text-[13px]",
          bold && "text-[15px] font-bold text-ink",
          accent && "font-medium text-success",
        )}
      >
        {value}
      </span>
    </div>
  );
}
