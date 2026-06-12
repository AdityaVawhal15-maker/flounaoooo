"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pizza, Car, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
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
  { key: "", label: "All" },
  { key: "food", label: "Food" },
  { key: "ride", label: "Rides" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-accent-soft text-accent",
  in_progress: "bg-accent-soft text-accent",
  completed: "bg-[#e3f6ec] text-success",
  pending_payment: "bg-beige text-cocoa",
  cancelled: "bg-[#fdeceb] text-danger",
};

export default function HistoryPage() {
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
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [tab]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 lg:px-6 lg:py-8">
      <h1 className="text-[20px] font-bold text-ink">History</h1>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-pill px-5 py-2 text-[13px] font-semibold transition-colors",
              tab === t.key
                ? "bg-cocoa text-white"
                : "border border-line bg-card text-cocoa hover:bg-beige/40",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-6 text-[13px] text-danger">{error}</p>}

      <div className="mt-5 flex flex-col gap-2.5">
        {orders === null && !error && (
          <p className="text-[13px] text-cocoa">Loading…</p>
        )}
        {orders?.length === 0 && (
          <p className="py-10 text-center text-[13px] text-cocoa">
            Nothing here yet — ask Radiues for food or a ride to get started.
          </p>
        )}
        {orders?.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`}>
            <Card className="transition-colors hover:bg-beige/30">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-beige/70">
                  {o.domain === "food" ? (
                    <Pizza size={18} className="text-accent" />
                  ) : (
                    <Car size={18} className="text-cocoa" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {o.title}
                  </p>
                  <p className="text-[11px] text-cocoa">
                    {new Date(o.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {o.provider.toUpperCase()}
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
                    {o.status.replace("_", " ")}
                  </span>
                </div>
                <ChevronRight size={16} className="shrink-0 text-cocoa/50" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
