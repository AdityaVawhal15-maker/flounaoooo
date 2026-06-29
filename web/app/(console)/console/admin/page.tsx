"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle, StatCard } from "@/components/console/ConsoleShell";

type Analytics = {
  users: { total: number; new7d: number; plus: number };
  orders: { total: number; byStatus: Record<string, number> };
  revenuePaise: number;
  revenue7dPaise: number;
  userSavedPaise: number;
  openTickets: number;
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function AdminHomePage() {
  const state = useOperator(["admin", "super_admin"]);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    if (state.status !== "ok") return;
    api<Analytics>("/api/console/admin/analytics").then(setData).catch(() => {});
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
      <PageTitle
        title="Operations"
        subtitle="Live snapshot of users, orders and revenue."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={data?.users.total ?? "—"} hint={`+${data?.users.new7d ?? 0} this week`} />
        <StatCard label="Radiues Plus" value={data?.users.plus ?? "—"} tone="good" hint="active subscribers" />
        <StatCard label="Orders" value={data?.orders.total ?? "—"} />
        <StatCard
          label="Open tickets"
          value={data?.openTickets ?? "—"}
          tone={data && data.openTickets > 0 ? "warn" : "good"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Revenue (paid)" value={data ? rupees(data.revenuePaise) : "—"} tone="good" />
        <StatCard label="Revenue (7d)" value={data ? rupees(data.revenue7dPaise) : "—"} />
        <StatCard label="Saved for users" value={data ? rupees(data.userSavedPaise) : "—"} hint="lifetime, vs next-best option" />
      </div>

      {data && (
        <div className="mt-8">
          <h2 className="mb-3 text-[14px] font-semibold text-slate-200">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.orders.byStatus).map(([status, count]) => (
              <span
                key={status}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[13px]"
              >
                <span className="capitalize text-slate-400">{status.replace(/_/g, " ")}</span>{" "}
                <span className="font-semibold text-slate-100">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
