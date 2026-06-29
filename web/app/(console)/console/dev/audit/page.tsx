"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

type AuditRow = {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  ip: string | null;
  createdAt: string;
};

export default function DevAuditPage() {
  const state = useOperator(["developer", "super_admin"]);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.status !== "ok") return;
    api<{ logs: AuditRow[] }>("/api/console/dev/audit?limit=100")
      .then((d) => setRows(d.logs))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
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
        title="Audit log"
        subtitle="Append-only record of privileged actions. Most recent first."
      />

      {loading ? (
        <div className="flex justify-center py-16 text-slate-600">
          <Loader2 className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-[14px] text-slate-500">
          No privileged actions recorded yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-emerald-400">{r.actorRole}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{r.action}</td>
                  <td className="px-4 py-2.5 text-slate-300">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConsoleShell>
  );
}
