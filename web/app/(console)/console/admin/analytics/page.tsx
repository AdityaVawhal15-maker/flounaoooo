"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard, PageTitle } from "@/components/console/ConsoleShell";
import { ConsolePage, Card, Empty, rupeesCompact } from "@/components/console/ui";
import { BarChartC, DonutChart } from "@/components/console/charts";

type Domain = { domain: string; gmvPaise: number; orders: number };
type Analytics = {
  users?: { total: number; new7d: number; plus: number };
  orders?: { total: number };
  revenuePaise?: number;
  revenue7dPaise?: number;
  userSavedPaise?: number;
};

export default function AnalyticsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [a, setA] = useState<Analytics | null>(null);

  useEffect(() => {
    api<{ domains: Domain[] }>("/api/console/admin/reports/gmv-by-domain")
      .then((d) => setDomains(d.domains))
      .catch(() => {});
    api<Analytics>("/api/console/admin/analytics").then(setA).catch(() => {});
  }, []);

  const gmvData = domains.map((d) => ({ name: d.domain, value: Math.round(d.gmvPaise / 100) }));
  const orderShare = domains
    .filter((d) => d.orders > 0)
    .map((d) => ({ name: d.domain, value: d.orders }));

  return (
    <ConsolePage accept={["admin", "super_admin"]}>
      <PageTitle title="Analytics" subtitle="Revenue and growth across all domains." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders (total)" value={a?.orders?.total ?? "—"} />
        <StatCard label="Revenue (all-time)" value={a?.revenuePaise != null ? rupeesCompact(a.revenuePaise) : "—"} tone="good" />
        <StatCard label="Revenue (7d)" value={a?.revenue7dPaise != null ? rupeesCompact(a.revenue7dPaise) : "—"} />
        <StatCard label="Saved for users" value={a?.userSavedPaise != null ? rupeesCompact(a.userSavedPaise) : "—"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="GMV by domain (₹)">
          <div className="p-4">
            {gmvData.length ? (
              <BarChartC data={gmvData} colorful valueLabel={(v) => `₹${v.toLocaleString("en-IN")}`} />
            ) : (
              <Empty>No paid orders yet.</Empty>
            )}
          </div>
        </Card>
        <Card title="Order share by domain">
          <div className="p-4">
            {orderShare.length ? <DonutChart data={orderShare} /> : <Empty>No paid orders yet.</Empty>}
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}
