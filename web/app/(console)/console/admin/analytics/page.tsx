"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/console/ConsoleShell";
import { ConsolePage, Card, BarRow, rupeesCompact } from "@/components/console/ui";

type Domain = { domain: string; gmvPaise: number; orders: number };
type Analytics = {
  users: { total: number; new7d: number; plus: number };
  orders: { total: number };
  revenuePaise: number;
  revenue7dPaise: number;
  userSavedPaise: number;
};

const COLORS: Record<string, string> = {
  food: "#F59E0B",
  ride: "#3B82F6",
  ecom: "#8B5CF6",
  travel: "#10B981",
  hotel: "#EF4444",
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

  const maxGmv = Math.max(1, ...domains.map((d) => d.gmvPaise));

  return (
    <ConsolePage accept={["admin", "super_admin"]}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">Analytics</h1>
        <p className="mt-1 text-[13px] text-slate-400">Revenue and growth across all domains.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders (total)" value={a?.orders.total ?? "—"} />
        <StatCard label="Revenue (all-time)" value={a ? rupeesCompact(a.revenuePaise) : "—"} tone="good" />
        <StatCard label="Revenue (7d)" value={a ? rupeesCompact(a.revenue7dPaise) : "—"} />
        <StatCard label="Saved for users" value={a ? rupeesCompact(a.userSavedPaise) : "—"} />
      </div>

      <div className="mt-6">
        <Card title="GMV by domain">
          <div className="py-2">
            {domains.length ? (
              domains.map((x) => (
                <BarRow
                  key={x.domain}
                  label={x.domain}
                  value={rupeesCompact(x.gmvPaise)}
                  max={(x.gmvPaise / maxGmv) * 100}
                  color={COLORS[x.domain] ?? "#64748B"}
                />
              ))
            ) : (
              <p className="px-4 py-6 text-center text-[13px] text-slate-500">No paid orders yet.</p>
            )}
          </div>
        </Card>
      </div>
    </ConsolePage>
  );
}
