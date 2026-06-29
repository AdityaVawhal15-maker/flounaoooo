"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MinusCircle, AlertCircle } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { ConsolePage, Card } from "@/components/console/ui";

type Settings = {
  ondcMinMarginBps: number;
  ondcMaxMarginBps: number;
  partnerAffiliateMinBps: number;
  cashbackUserSharePct: number;
  apiFailureRatePct: number;
  decisionLatencyAlertSec: number;
  ondcPingAlertMs: number;
};

type ConfigStatus = {
  runtime: { nodeEnv: string; providerMode: string; llmProvider: string };
  secrets: Record<string, boolean>;
};

// Field definitions: label, key, unit, and whether the raw value is bps (shown
// as %) or a plain number.
const FIELDS: { key: keyof Settings; label: string; unit: string; bps?: boolean }[] = [
  { key: "ondcMinMarginBps", label: "ONDC min margin", unit: "%", bps: true },
  { key: "ondcMaxMarginBps", label: "ONDC max margin", unit: "%", bps: true },
  { key: "partnerAffiliateMinBps", label: "Partner affiliate min", unit: "%", bps: true },
  { key: "cashbackUserSharePct", label: "Cashback share to user", unit: "%" },
  { key: "apiFailureRatePct", label: "API failure-rate alert", unit: "%" },
  { key: "decisionLatencyAlertSec", label: "Decision latency alert", unit: "s" },
  { key: "ondcPingAlertMs", label: "ONDC ping alert", unit: "ms" },
];

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [cfg, setCfg] = useState<ConfigStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<Settings>("/api/console/super/settings").then(setS).catch(() => {});
    api<ConfigStatus>("/api/console/super/config").then(setCfg).catch(() => {});
  }, []);

  function setField(key: keyof Settings, display: number, bps?: boolean) {
    if (!s) return;
    // % fields stored as basis points: 4% → 400 bps.
    const raw = bps ? Math.round(display * 100) : Math.round(display);
    setS({ ...s, [key]: raw });
  }

  async function save() {
    if (!s) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api<Settings>("/api/console/super/settings", {
        method: "PATCH",
        json: s,
      });
      setS(updated); // reflect any server-side clamping
      setMsg("Saved. ONDC margins are clamped to DPIIT norms (3–6%).");
    } catch (err) {
      setMsg(err instanceof ApiClientError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsolePage accept={["super_admin"]}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Commission and alert thresholds. ONDC margins are bounded by government norms.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !s}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Save changes
        </button>
      </div>

      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-slate-300">
          <AlertCircle size={15} className="text-amber-400" /> {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Thresholds">
          <div className="divide-y divide-slate-800/60">
            {s &&
              FIELDS.map((f) => {
                const display = f.bps ? s[f.key] / 100 : s[f.key];
                return (
                  <div key={f.key} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <span className="text-slate-300">{f.label}</span>
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        step={f.bps ? "0.1" : "1"}
                        value={display}
                        onChange={(e) => setField(f.key, Number(e.target.value), f.bps)}
                        className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[13px] text-slate-100"
                      />
                      <span className="w-6 text-slate-500">{f.unit}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>

        <Card title="Configuration status">
          {cfg && (
            <>
              <div className="flex flex-wrap gap-2 border-b border-slate-800 px-4 py-3">
                {Object.entries(cfg.runtime).map(([k, v]) => (
                  <span key={k} className="rounded bg-slate-800/60 px-2 py-1 text-[11px]">
                    <span className="text-slate-400">{k.replace(/([A-Z])/g, " $1")}</span>{" "}
                    <span className="font-mono text-emerald-300">{v}</span>
                  </span>
                ))}
              </div>
              <ul className="divide-y divide-slate-800/60">
                {Object.entries(cfg.secrets).map(([key, on]) => (
                  <li key={key} className="flex items-center justify-between px-4 py-2 text-[12px]">
                    <span className="capitalize text-slate-300">{key.replace(/([A-Z])/g, " $1")}</span>
                    {on ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={13} /> set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MinusCircle size={13} /> not set
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </ConsolePage>
  );
}
