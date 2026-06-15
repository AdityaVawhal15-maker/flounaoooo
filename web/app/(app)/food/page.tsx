"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Zap, MapPin, Star, Clock, ChevronRight, Users, Utensils } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { AdviceBanner, type Advice } from "@/components/ui/AdviceBanner";
import { BudgetBar, useBudget } from "@/components/food/BudgetBar";
import { FadeIn, ScrollReveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/components/i18n/I18nContext";
import type { FoodQuote } from "@/components/chat/types";

type Feed = {
  categories: string[];
  picks: FoodQuote[];
  suggestions: {
    fastestDeliveryMinutes: number;
    nearestKm: number;
    topRatedCount: number;
  };
  advice?: Advice;
};

export default function FoodLandingPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodQuote[] | null>(null);
  const [error, setError] = useState("");
  const budget = useBudget();
  const { t } = useI18n();

  useEffect(() => {
    api<Feed>("/api/food/feed")
      .then(setFeed)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const activeQuery = (category === "All" ? query : `${query} ${category}`).trim();

  useEffect(() => {
    if (!activeQuery) return;
    const t = setTimeout(() => {
      api<{ quotes: FoodQuote[] }>(
        `/api/food/search?q=${encodeURIComponent(activeQuery)}`,
      )
        .then((d) => setResults(d.quotes))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [activeQuery]);

  const showSearch = activeQuery !== "" && results !== null;
  const loading = !feed && !error;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6 lg:py-8">
      {/* Search */}
      <FadeIn y={8}>
        <div className="flex items-center gap-2 rounded-pill border border-line bg-card px-4 py-3 shadow-card">
          <Search size={18} className="text-cocoa/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("food.searchPlaceholder")}
            maxLength={120}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-cocoa/50"
          />
        </div>
      </FadeIn>

      {/* Categories */}
      <FadeIn delay={0.06} y={8}>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {(feed?.categories ?? ["All"]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                c === category
                  ? "shrink-0 rounded-[14px] border border-accent bg-accent-soft px-4 py-2.5 text-[13px] font-semibold text-accent"
                  : "shrink-0 rounded-[14px] border border-line bg-card px-4 py-2.5 text-[13px] text-cocoa transition-colors hover:bg-beige/40"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </FadeIn>

      {error && <p className="mt-6 text-[13px] text-danger">{error}</p>}

      {!showSearch && (
        <FadeIn delay={0.12} y={8}>
          <Link
            href="/food/group"
            className="mt-4 flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent-soft/50 px-4 py-3 transition-colors hover:bg-accent-soft"
          >
            <span className="flex shrink-0">
              <CategoryTile icon={Users} theme="orange" size={38} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink">{t("food.groupOrder")}</p>
              <p className="text-[12px] text-cocoa">{t("food.groupOrderSub")}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-cocoa/50" />
          </Link>
        </FadeIn>
      )}

      {showSearch ? (
        <section className="mt-6">
          <h2 className="text-[17px] font-bold text-ink">Results</h2>
          <Stagger className="mt-3 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
            {results.length === 0 && (
              <p className="text-[13px] text-cocoa">No matches — try “biryani”, “pizza” or “dosa”.</p>
            )}
            {results.map((q) => (
              <StaggerItem key={`${q.dishId}-${q.platform}`}>
                <DishRow q={q} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : loading ? (
        <div className="mt-6 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {budget && <BudgetBar budget={budget} />}
          {feed?.advice && <AdviceBanner advice={feed.advice} className="mt-5" />}

          {/* AI picks */}
          <section className="mt-6">
            <p className="flex items-center gap-1 text-[12px] font-semibold text-accent">
              AI Recommends ✦
            </p>
            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-ink">{t("food.pickedForYou")}</h2>
              <Link
                href="/home"
                className="rounded-pill border border-accent px-3 py-1 text-[12px] font-semibold text-accent transition-colors hover:bg-accent-soft"
              >
                Ask Radiues
              </Link>
            </div>
            <Stagger className="mt-3 flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
              {(feed?.picks ?? []).map((q) => (
                <StaggerItem key={q.dishId}>
                  <DishRow q={q} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>

          {/* Smart suggestions */}
          <ScrollReveal className="mt-8">
            <h2 className="text-[17px] font-bold text-ink">{t("food.smartSuggestions")}</h2>
            <p className="text-[12px] text-cocoa">
              Recommendations based on speed, distance &amp; ratings
            </p>
            <div className="mt-3 flex flex-col gap-2.5">
              <SuggestionRow
                icon={Zap}
                theme="orange"
                title="Fastest Delivery"
                subtitle="Get your food in the least time possible"
                value={`From ${feed?.suggestions.fastestDeliveryMinutes ?? "–"} min`}
                onPick={() => setQuery("momos")}
              />
              <SuggestionRow
                icon={MapPin}
                theme="green"
                title="Nearest to You"
                subtitle="Top restaurants near your location"
                value={`Within ${feed?.suggestions.nearestKm ?? "–"} km`}
                onPick={() => setQuery("thali")}
              />
              <SuggestionRow
                icon={Star}
                theme="purple"
                title="Top Rated Near You"
                subtitle="Highly rated restaurants you'll love"
                value="4.0+ rated"
                onPick={() => setQuery("cake")}
              />
            </div>
          </ScrollReveal>
        </>
      )}
    </div>
  );
}

function DishRow({ q }: { q: FoodQuote }) {
  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center gap-3">
        <span className="shrink-0">
          <CategoryTile icon={Utensils} theme="amber" size={48} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            {q.tag}
          </span>
          <p className="mt-1 truncate text-[15px] font-bold text-ink">{q.name}</p>
          <p className="flex items-center gap-2 text-[12px] text-cocoa">
            <span className="flex items-center gap-0.5">
              <Clock size={12} /> {q.etaMinutes} min
            </span>
            <span className="flex items-center gap-0.5">
              <Star size={12} className="fill-accent text-accent" /> {q.rating}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p className="text-[16px] font-bold text-ink">{rupees(q.effectivePaise)}</p>
          <Link
            href={`/food/order/${q.dishId}?platform=${q.platform}`}
            className="rounded-pill bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#d4570f]"
          >
            Order now
          </Link>
        </div>
      </div>
    </Card>
  );
}

function SuggestionRow({
  icon,
  theme,
  title,
  subtitle,
  value,
  onPick,
}: {
  icon: React.ComponentProps<typeof CategoryTile>["icon"];
  theme: React.ComponentProps<typeof CategoryTile>["theme"];
  title: string;
  subtitle: string;
  value: string;
  onPick: () => void;
}) {
  return (
    <button onClick={onPick} className="text-left">
      <Card className="transition-all hover:-translate-y-0.5 hover:shadow-card">
        <div className="flex items-center gap-3">
          <span className="shrink-0">
            <CategoryTile icon={icon} theme={theme} size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-ink">{title}</p>
            <p className="truncate text-[12px] text-cocoa">{subtitle}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-cocoa">
            {value} <ChevronRight size={14} />
          </span>
        </div>
      </Card>
    </button>
  );
}
