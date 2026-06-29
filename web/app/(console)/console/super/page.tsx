"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle, StatCard } from "@/components/console/ConsoleShell";

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
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ConsoleShell operator={state.operator}>
      <PageTitle title="Revenue" subtitle="Gross volume, subscriptions and refunds." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Gross (paid)" value={rev ? rupees(rev.grossPaise) : "—"} tone="good" />
        <StatCard label="Gross (30d)" value={rev ? rupees(rev.gross30dPaise) : "—"} />
        <StatCard
          label="Plus run-rate"
          value={rev ? `${rupees(rev.subscriptions.monthlyRunRatePaise)}/mo` : "—"}
          tone="good"
          hint={rev ? `${rev.subscriptions.activePlus} subscribers` : undefined}
        />
        <StatCard
          label="Refunds pending"
          value={rev?.refunds.pending ?? "—"}
          tone={rev && rev.refunds.pending > 0 ? "warn" : "good"}
        />
      </div>

      {rev && (
        <div className="mt-8">
          <h2 className="mb-3 text-[14px] font-semibold text-slate-200">By domain</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(rev.byDomain).map(([domain, d]) => (
              <div
                key={domain}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <p className="text-[12px] capitalize text-slate-400">{domain}</p>
                <p className="mt-1 text-xl font-semibold text-slate-100">
                  {rupees(d.grossPaise)}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">{d.orders} orders</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
