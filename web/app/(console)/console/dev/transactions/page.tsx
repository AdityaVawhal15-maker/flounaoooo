"use client";

import { useEffect, useState } from "react";
import { X, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { ConsolePage, Card, Table, Badge, Empty } from "@/components/console/ui";

type Txn = {
  id: string;
  txnId: string;
  action: string;
  domain: string;
  bppId: string | null;
  status: string;
  signed: boolean;
  latencyMs: number | null;
  simulated: boolean;
  createdAt: string;
  orderId: string | null;
};

type Detail = Txn & { request: string | null; response: string | null };

// Request actions vs their callbacks get different tones.
function actionTone(action: string) {
  return action.startsWith("on_") ? "purple" : "blue";
}

const ACTIONS = ["", "search", "on_search", "select", "confirm", "on_confirm", "status", "on_status"];

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [meta, setMeta] = useState({ total: 0, mode: "", byAction: {} as Record<string, number> });
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState<Detail | null>(null);

  useEffect(() => {
    api<{ transactions: Txn[]; total: number; mode: string; byAction: Record<string, number> }>(
      `/api/console/dev/transactions${filter ? `?action=${filter}` : ""}`,
    )
      .then((d) => {
        setTxns(d.transactions);
        setMeta({ total: d.total, mode: d.mode, byAction: d.byAction });
      })
      .catch(() => setTxns([]));
  }, [filter]);

  function openDetail(id: string) {
    api<{ transaction: Detail }>(`/api/console/dev/transactions/${id}`)
      .then((d) => setOpen(d.transaction))
      .catch(() => {});
  }

  return (
    <ConsolePage accept={["developer", "super_admin"]}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">ONDC transactions</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Beckn request/callback envelopes per order journey.{" "}
            {meta.mode && meta.mode !== "ondc" && (
              <span className="text-amber-400">Simulated until registration.</span>
            )}
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-200"
        >
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a === "" ? "All actions" : a}
            </option>
          ))}
        </select>
      </div>

      <Card title={`${meta.total} envelopes`}>
        {txns.length === 0 ? (
          <Empty>No transactions yet — place + pay an order to generate the flow.</Empty>
        ) : (
          <Table head={["Action", "Domain", "BPP", "Status", "Signed", "Latency", "When", ""]}>
            {txns.map((t) => (
              <tr key={t.id} className="cursor-pointer hover:bg-slate-900/40" onClick={() => openDetail(t.id)}>
                <td className="px-4 py-2.5">
                  <Badge tone={actionTone(t.action)}>{t.action}</Badge>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-400">{t.domain}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{t.bppId ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={t.status === "ack" ? "green" : "red"}>{t.status}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {t.signed ? <ShieldCheck size={14} className="text-emerald-400" /> : "—"}
                </td>
                <td className="px-4 py-2.5 text-slate-300">{t.latencyMs != null ? `${t.latencyMs} ms` : "—"}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {new Date(t.createdAt).toLocaleTimeString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">
                  <ArrowRightLeft size={13} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Envelope detail drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setOpen(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <Badge tone={actionTone(open.action)}>{open.action}</Badge>
                <p className="mt-2 font-mono text-[12px] text-slate-400">txn {open.txnId}</p>
                {open.orderId && (
                  <p className="font-mono text-[11px] text-slate-600">order {open.orderId}</p>
                )}
              </div>
              <button onClick={() => setOpen(null)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
              <span className="rounded bg-slate-900 px-2 py-1 text-slate-400">
                domain <span className="font-mono text-slate-200">{open.domain}</span>
              </span>
              <span className="rounded bg-slate-900 px-2 py-1 text-slate-400">
                status <span className="font-mono text-emerald-300">{open.status}</span>
              </span>
              {open.signed && (
                <span className="rounded bg-emerald-900/40 px-2 py-1 text-emerald-300">Ed25519 signed</span>
              )}
              {open.simulated && (
                <span className="rounded bg-amber-900/40 px-2 py-1 text-amber-300">simulated</span>
              )}
            </div>

            {open.request && (
              <div className="mb-4">
                <p className="mb-1 text-[12px] font-semibold text-slate-400">Request envelope</p>
                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] leading-relaxed text-slate-300">
                  {JSON.stringify(JSON.parse(open.request), null, 2)}
                </pre>
              </div>
            )}
            {open.response && (
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-400">Callback envelope</p>
                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] leading-relaxed text-slate-300">
                  {JSON.stringify(JSON.parse(open.response), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </ConsolePage>
  );
}
