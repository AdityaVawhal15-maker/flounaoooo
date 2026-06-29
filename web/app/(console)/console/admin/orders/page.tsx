"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

type Order = {
  id: string;
  domain: string;
  status: string;
  provider: string;
  title: string;
  amount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  payment: { status: string; method: string | null } | null;
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

const STATUSES = ["", "confirmed", "in_progress", "completed", "cancelled"];

export default function AdminOrdersPage() {
  const state = useOperator(["admin", "super_admin"]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api<{ orders: Order[] }>(
      `/api/console/admin/orders${status ? `?status=${status}` : ""}`,
    )
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (state.status === "ok") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, status]);

  async function flagRefund(id: string) {
    setBusy(id);
    try {
      await api(`/api/console/admin/orders/${id}/flag-refund`, { method: "POST" });
      setOrders((os) =>
        os.map((o) =>
          o.id === id && o.payment
            ? { ...o, payment: { ...o.payment, status: "refund_pending" } }
            : o,
        ),
      );
    } catch {
      /* not refundable — ignore */
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
      <div className="flex items-center justify-between">
        <PageTitle title="Orders" />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-200"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? "All statuses" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-600">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-900/60 text-[12px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-100">{o.title}</p>
                    <p className="text-[12px] capitalize text-slate-500">
                      {o.domain} · {o.provider}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{o.user.email}</td>
                  <td className="px-4 py-2.5 text-slate-200">{rupees(o.amount)}</td>
                  <td className="px-4 py-2.5 capitalize text-slate-300">
                    {o.status.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        o.payment?.status === "success"
                          ? "text-emerald-400"
                          : o.payment?.status === "refund_pending"
                            ? "text-amber-400"
                            : "text-slate-500"
                      }
                    >
                      {o.payment?.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {o.payment?.status === "success" ? (
                      <button
                        onClick={() => flagRefund(o.id)}
                        disabled={busy === o.id}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-[12px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        <RefreshCcw size={12} /> Flag refund
                      </button>
                    ) : (
                      <span className="text-[12px] text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No orders.
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
