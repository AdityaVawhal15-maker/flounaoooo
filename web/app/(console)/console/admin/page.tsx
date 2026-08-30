"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard, PageTitle } from "@/components/console/ConsoleShell";
import { ConsolePage, Card, Empty, rupeesCompact, rupees } from "@/components/console/ui";
import { DonutChart, BarChartC } from "@/components/console/charts";

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

export default function AdminDashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/console/admin/dashboard").then(setD).catch(() => {});
  }, []);

  const domainData =
    d?.domainBreakdown.map((x) => ({ name: x.domain, value: x.count })) ?? [];
  const revenueData = d
    ? [
        { name: "ONDC", value: Math.round(d.revenue.ondcPaise / 100) },
        { name: "Partner", value: Math.round(d.revenue.partnerPaise / 100) },
        { name: "Convenience", value: Math.round(d.revenue.conveniencePaise / 100) },
      ]
    : [];

  return (
    <ConsolePage accept={["admin", "super_admin"]}>
      <PageTitle
        title="Dashboard"
        subtitle="Live snapshot across the decision engine. All figures computed server-side."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total orders" value={d?.totalOrders ?? "No data"} />
        <StatCard label="GMV" value={d ? rupeesCompact(d.gmvPaise) : "No data"} tone="good" />
        <StatCard
          label="ONDC orders"
          value={d?.ondcOrders ?? "No data"}
          hint={d ? `${d.ondcSharePct}% of paid` : undefined}
        />
        <StatCard label="Active users" value={d?.activeUsers ?? "No data"} hint={d ? `+${d.newUsers7d} new (7d)` : undefined} />
        <StatCard label="Saved for users" value={d ? rupeesCompact(d.userSavedPaise) : "No data"} tone="good" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue · total" value={d ? rupees(d.revenue.totalPaise) : "No data"} tone="good" />
        <StatCard label="· ONDC margin" value={d ? rupees(d.revenue.ondcPaise) : "No data"} />
        <StatCard label="· Partner" value={d ? rupees(d.revenue.partnerPaise) : "No data"} />
        <StatCard label="· Convenience" value={d ? rupees(d.revenue.conveniencePaise) : "No data"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Orders by domain">
          <div className="p-4">
            {domainData.length ? (
              <DonutChart data={domainData} />
            ) : (
              <Empty>No paid orders yet, place a test order to populate this.</Empty>
            )}
          </div>
        </Card>
        <Card title="Revenue split (₹)">
          <div className="p-4">
            {d && d.revenue.totalPaise > 0 ? (
              <BarChartC data={revenueData} colorful valueLabel={(v) => `₹${v.toLocaleString("en-IN")}`} />
            ) : (
              <Empty>No revenue yet.</Empty>
            )}
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}
