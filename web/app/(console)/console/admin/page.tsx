"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/console/ConsoleShell";
import { ConsolePage, Card, BarRow, rupeesCompact, rupees } from "@/components/console/ui";

type Dashboard = {
  totalOrders: number;
  gmvPaise: number;
  ondcOrders: number;
  ondcSharePct: number;
  activeUsers: number;
  newUsers7d: number;
  userSavedPaise: number;
  revenue: { ondcPaise: number; partnerPaise: number; conveniencePaise: number; totalPaise: number };
  domainBreakdown: { domain: string; count: number }[];
};

const DOMAIN_COLORS: Record<string, string> = {
  food: "#F59E0B",
  ride: "#3B82F6",
  ecom: "#8B5CF6",
  travel: "#10B981",
  hotel: "#EF4444",
};

export default function AdminDashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/console/admin/dashboard").then(setD).catch(() => {});
  }, []);

  const maxCount = d ? Math.max(1, ...d.domainBreakdown.map((x) => x.count)) : 1;

  return (
    <ConsolePage accept={["admin", "super_admin"]}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-[13px] text-slate-400">
          Live snapshot across the decision engine. All figures computed server-side.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total orders" value={d?.totalOrders ?? "—"} />
        <StatCard label="GMV" value={d ? rupeesCompact(d.gmvPaise) : "—"} tone="good" />
        <StatCard
          label="ONDC orders"
          value={d?.ondcOrders ?? "—"}
          hint={d ? `${d.ondcSharePct}% of paid` : undefined}
        />
        <StatCard label="Active users" value={d?.activeUsers ?? "—"} hint={d ? `+${d.newUsers7d} new (7d)` : undefined} />
        <StatCard label="Saved for users" value={d ? rupeesCompact(d.userSavedPaise) : "—"} tone="good" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue · total" value={d ? rupees(d.revenue.totalPaise) : "—"} tone="good" />
        <StatCard label="· ONDC margin" value={d ? rupees(d.revenue.ondcPaise) : "—"} />
        <StatCard label="· Partner" value={d ? rupees(d.revenue.partnerPaise) : "—"} />
        <StatCard label="· Convenience" value={d ? rupees(d.revenue.conveniencePaise) : "—"} />
      </div>

      <div className="mt-6">
        <Card title="Domain breakdown">
          <div className="py-2">
            {d?.domainBreakdown.length ? (
              d.domainBreakdown.map((x) => (
                <BarRow
                  key={x.domain}
                  label={x.domain}
                  value={String(x.count)}
                  max={(x.count / maxCount) * 100}
                  color={DOMAIN_COLORS[x.domain] ?? "#64748B"}
                />
              ))
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-slate-500">
                No paid orders yet — place a test order to populate this.
              </p>
            )}
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}
