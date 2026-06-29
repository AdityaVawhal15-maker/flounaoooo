"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

type AuditRow = {
  id: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  ip: string | null;
  createdAt: string;
};

export default function SuperAuditPage() {
  const state = useOperator(["super_admin"]);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.status !== "ok") return;
    api<{ logs: AuditRow[]; total: number }>(`/api/console/super/audit?page=${page}`)
      .then((d) => {
        setRows(d.logs);
        setTotal(d.total);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [state.status, page]);

  if (state.status !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <ConsoleShell operator={state.operator}>
      <PageTitle
        title="Audit trail"
        subtitle={`${total} recorded actions — append-only.`}
      />

      <div className="overflow-hidden rounded-xl border border-slate-800">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-600">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Summary</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-400">
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5 text-emerald-400">{r.actorRole}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{r.action}</td>
                  <td className="px-4 py-2.5 text-slate-300">{r.summary}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500">
                    {r.ip ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[13px] text-slate-400">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </ConsoleShell>
  );
}
