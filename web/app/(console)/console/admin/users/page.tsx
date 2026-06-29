"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Ban, RotateCcw, BadgeCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  plusActive: boolean;
  suspended: boolean;
  orderCount: number;
  createdAt: string;
};

export default function AdminUsersPage() {
  const state = useOperator(["admin", "super_admin"]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load(query = q) {
    api<{ users: Row[]; total: number }>(
      `/api/console/admin/users?q=${encodeURIComponent(query)}`,
    )
      .then((d) => {
        setRows(d.users);
        setTotal(d.total);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (state.status === "ok") load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  async function toggleSuspend(row: Row) {
    setBusy(row.id);
    try {
      await api(`/api/console/admin/users/${row.id}/suspend`, {
        method: "PATCH",
        json: { suspended: !row.suspended },
      });
      setRows((rs) =>
        rs.map((r) => (r.id === row.id ? { ...r, suspended: !r.suspended } : r)),
      );
    } catch {
      /* operator accounts can't be suspended here — ignore */
    } finally {
      setBusy(null);
    }
  }

  if (state.status !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ConsoleShell operator={state.operator}>
      <PageTitle title="Users" subtitle={`${total} accounts`} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3"
      >
        <Search size={16} className="text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or phone"
          className="h-10 flex-1 bg-transparent text-[14px] text-slate-100 outline-none placeholder:text-slate-600"
        />
      </form>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-600">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Orders</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-2.5">
                    <p className="flex items-center gap-1.5 font-medium text-slate-100">
                      {r.name}
                      {r.emailVerified && (
                        <BadgeCheck size={13} className="text-emerald-400" />
                      )}
                    </p>
                    <p className="text-[12px] text-slate-500">{r.email}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        r.role === "user"
                          ? "text-slate-400"
                          : "font-medium text-amber-400"
                      }
                    >
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{r.orderCount}</td>
                  <td className="px-4 py-2.5">
                    {r.suspended ? (
                      <span className="text-rose-400">Suspended</span>
                    ) : r.plusActive ? (
                      <span className="text-emerald-400">Plus</span>
                    ) : (
                      <span className="text-slate-500">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.role === "user" ? (
                      <button
                        onClick={() => toggleSuspend(r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-[12px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {r.suspended ? (
                          <>
                            <RotateCcw size={12} /> Reinstate
                          </>
                        ) : (
                          <>
                            <Ban size={12} /> Suspend
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[12px] text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ConsoleShell>
  );
}
