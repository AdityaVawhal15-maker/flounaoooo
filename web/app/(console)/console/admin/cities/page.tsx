"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConsolePage, Card, Table, Badge, rupees } from "@/components/console/ui";

type Row = {
  rank: number;
  city: string;
  state: string;
  tier: string;
  orders: number;
  gmvPaise: number;
  savedPaise: number;
  demo: boolean;
};

export default function CityReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    api<{ citiesActive: number; rows: Row[] }>("/api/console/admin/cities")
      .then((d) => {
        setRows(d.rows);
        setActive(d.citiesActive);
      })
      .catch(() => {});
  }, []);

  return (
    <ConsolePage accept={["admin", "super_admin"]}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">City report</h1>
        <p className="mt-1 text-[13px] text-slate-400">
          {active} cities · live volume on our launch city, demo coverage elsewhere (flagged).
        </p>
      </div>

      <Card title="City performance">
        <Table head={["#", "City", "State", "Tier", "Orders", "GMV", "Saved", ""]}>
          {rows.map((r) => (
            <tr key={r.city} className="hover:bg-slate-900/40">
              <td className="px-4 py-2.5 text-slate-500">{r.rank}</td>
              <td className="px-4 py-2.5 font-medium text-slate-100">{r.city}</td>
              <td className="px-4 py-2.5 text-slate-400">{r.state}</td>
              <td className="px-4 py-2.5">
                <Badge tone={r.tier === "Tier 1" ? "blue" : "slate"}>{r.tier}</Badge>
              </td>
              <td className="px-4 py-2.5 text-slate-300">{r.orders}</td>
              <td className="px-4 py-2.5 text-slate-300">{rupees(r.gmvPaise)}</td>
              <td className="px-4 py-2.5 text-emerald-400">{rupees(r.savedPaise)}</td>
              <td className="px-4 py-2.5">
                {r.demo ? <Badge tone="amber">demo coverage</Badge> : <Badge tone="green">live</Badge>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </ConsolePage>
  );
}
