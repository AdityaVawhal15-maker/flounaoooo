"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pizza, Car, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { CategoryTile } from "@/components/ui/CategoryTile";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/components/i18n/I18nContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/cn";

type OrderSummary = {
  id: string;
  domain: "food" | "ride";
  status: string;
  provider: string;
  title: string;
  amount: number;
  createdAt: string;
};

const TABS = [
  { key: "", labelKey: "history.all" },
  { key: "food", labelKey: "nav.food" },
  { key: "ride", labelKey: "nav.rides" },
] as const satisfies ReadonlyArray<{ key: string; labelKey: TranslationKey }>;

// Maps a server status to a localized label key; unknown statuses fall back to
// a humanized version of the raw value.
const STATUS_KEYS: Record<string, TranslationKey> = {
  confirmed: "status.confirmed",
  in_progress: "status.in_progress",
  completed: "status.completed",
  pending_payment: "status.pending_payment",
  cancelled: "status.cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-accent-soft text-accent",
  in_progress: "bg-accent-soft text-accent",
  completed: "bg-[#e3f6ec] text-success",
  pending_payment: "bg-beige text-cocoa",
  cancelled: "bg-[#fdeceb] text-danger",
};

export default function HistoryPage() {
  const { t, lang } = useI18n();
  const localeTag = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN";
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("");
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState("");

  // Reset-during-render on tab change (React's recommended alternative to
  // a synchronous setState inside an effect).
  const [prevTab, setPrevTab] = useState(tab);
  if (prevTab !== tab) {
    setPrevTab(tab);
    setOrders(null);
  }

  useEffect(() => {
    api<{ orders: OrderSummary[] }>(`/api/orders${tab ? `?domain=${tab}` : ""}`)
      .then((d) => setOrders(d.orders))
      .catch(() => setError(t("history.loadError")));
  }, [tab, t]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
      <FadeIn y={8}>
        <h1 className="text-[20px] font-bold text-ink">{t("history.title")}</h1>
      </FadeIn>

      <div className="mt-4 flex gap-2">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              "rounded-pill px-5 py-2 text-[13px] font-semibold transition-colors",
              tab === tabItem.key
                ? "bg-cocoa text-white"
                : "border border-line bg-card text-cocoa hover:bg-beige/40",
            )}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-[13px] text-danger">{error}</p>}

      <Stagger className="mt-5 flex flex-col gap-2.5">
        {orders === null && !error &&
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        {orders?.length === 0 && (
          <p className="py-10 text-center text-[13px] text-cocoa">
            {t("history.empty")}
          </p>
        )}
        {orders?.map((o) => (
          <StaggerItem key={o.id}>
          <Link href={`/orders/${o.id}`}>
            <Card className="transition-all hover:-translate-y-0.5 hover:shadow-card">
              <div className="flex items-center gap-3">
                <span className="shrink-0">
                  <CategoryTile
                    icon={o.domain === "food" ? Pizza : Car}
                    theme={o.domain === "food" ? "orange" : "blue"}
                    size={40}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {o.title}
                  </p>
                  <p className="text-[11px] text-cocoa">
                    {new Date(o.createdAt).toLocaleString(localeTag, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}

                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-bold text-ink">{rupees(o.amount)}</p>
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                      STATUS_STYLES[o.status] ?? "bg-beige text-cocoa",
                    )}
                  >
                    {STATUS_KEYS[o.status]
                      ? t(STATUS_KEYS[o.status]!)
                      : o.status.replace("_", " ")}
                  </span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-cocoa/50" />
              </div>
            </Card>
          </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
