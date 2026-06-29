"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConsolePage, Card, Badge } from "@/components/console/ui";

type Network = {
  mode: string;
  gatewayPingMs: number | null;
  domains: { domain: string; status: string }[];
};

function statusBadge(status: string) {
  if (status === "online") return <Badge tone="green">Online</Badge>;
  if (status === "simulated") return <Badge tone="amber">Simulated</Badge>;
  return <Badge tone="slate">Planned</Badge>;
}

export default function NetworkPage() {
  const [net, setNet] = useState<Network | null>(null);

  useEffect(() => {
    api<Network>("/api/console/dev/network").then(setNet).catch(() => {});
  }, []);

  return (
    <ConsolePage accept={["developer", "super_admin"]}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">ONDC network</h1>
        <p className="mt-1 text-[13px] text-slate-400">
          Per-domain network status. Simulated until ONDC participant registration.
        </p>
      </div>

      {net && (
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[13px]">
            <span className="text-slate-400">Mode</span>{" "}
            <span className="font-mono text-emerald-300">{net.mode}</span>
          </span>
          <span className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[13px]">
            <span className="text-slate-400">Gateway ping</span>{" "}
            <span className="font-mono text-slate-200">
              {net.gatewayPingMs != null ? `${net.gatewayPingMs} ms` : "— (offline)"}
            </span>
          </span>
        </div>
      )}

      <Card title="Domain networks">
        <ul className="divide-y divide-slate-800/60">
          {net?.domains.map((d) => (
            <li key={d.domain} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span className="capitalize text-slate-200">{d.domain}</span>
              {statusBadge(d.status)}
            </li>
          ))}
        </ul>
      </Card>
    </ConsolePage>
  );
}
