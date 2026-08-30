"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle, StatCard } from "@/components/console/ConsoleShell";
import { Card, Empty } from "@/components/console/ui";
import { DonutChart, BarChartC } from "@/components/console/charts";

type Revenue = {
  grossPaise: number;
  gross30dPaise: number;
  byDomain: Record<string, { grossPaise: number; orders: number }>;
  subscriptions: { activePlus: number; monthlyRunRatePaise: number; planPaise: number };
  refunds: { pending: number; refundedPaise: number };
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function SuperRevenuePage() {
  const state = useOperator(["super_admin"]);
  const [rev, setRev] = useState<Revenue | null>(null);

  useEffect(() => {
    if (state.status !== "ok") return;
    api<Revenue>("/api/console/super/revenue").then(setRev).catch(() => {});
  }, [state.status]);

  if (state.status !== "ok") {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ color: "var(--c-maroon)" }}
      >
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const domainEntries = rev ? Object.entries(rev.byDomain) : [];
  const domainBars = domainEntries.map(([domain, d]) => ({
    name: domain,
    value: Math.round(d.grossPaise / 100),
  }));
  const revenueSplit = rev
    ? [
        { name: "Gross (30d)", value: Math.round(rev.gross30dPaise / 100) },
        {
          name: "Plus run-rate",
          value: Math.round(rev.subscriptions.monthlyRunRatePaise / 100),
        },
        { name: "Refunded", value: Math.round(rev.refunds.refundedPaise / 100) },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <ConsoleShell operator={state.operator}>
      <PageTitle title="Revenue & commissions" subtitle="Gross volume, subscriptions and refunds." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Gross (paid)" value={rev ? rupees(rev.grossPaise) : "No data"} tone="good" />
        <StatCard label="Gross (30d)" value={rev ? rupees(rev.gross30dPaise) : "No data"} />
        <StatCard
          label="Plus run-rate"
          value={rev ? `${rupees(rev.subscriptions.monthlyRunRatePaise)}/mo` : "No data"}
          tone="good"
          hint={rev ? `${rev.subscriptions.activePlus} subscribers` : undefined}
        />
        <StatCard
          label="Refunds pending"
          value={rev?.refunds.pending ?? "No data"}
          tone={rev && rev.refunds.pending > 0 ? "warn" : "good"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Gross by domain (₹)">
          <div className="p-4">
            {domainBars.length ? (
              <BarChartC data={domainBars} colorful valueLabel={(v) => `₹${v.toLocaleString("en-IN")}`} />
            ) : (
              <Empty>No paid orders yet.</Empty>
            )}
          </div>
        </Card>
        <Card title="Revenue mix (₹)">
          <div className="p-4">
            {revenueSplit.length ? <DonutChart data={revenueSplit} /> : <Empty>No revenue yet.</Empty>}
          </div>
        </Card>
      </div>

      {domainEntries.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {domainEntries.map(([domain, d]) => (
              <div
                key={domain}
                className="rounded-xl bg-white p-4"
                style={{ border: "1px solid var(--c-border)" }}
              >
                <p className="c-label text-[10.5px]" style={{ color: "var(--c-muted)" }}>
                  {domain}
                </p>
                <p
                  className="c-serif mt-1 text-xl font-extrabold"
                  style={{ color: "var(--c-maroon)" }}
                >
                  {rupees(d.grossPaise)}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--c-muted)" }}>
                  {d.orders} orders
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
