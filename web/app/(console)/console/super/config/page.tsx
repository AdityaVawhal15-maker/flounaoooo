"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, MinusCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

type Config = {
  runtime: { nodeEnv: string; providerMode: string; llmProvider: string };
  secrets: Record<string, boolean>;
};

export default function SuperConfigPage() {
  const state = useOperator(["super_admin"]);
  const [cfg, setCfg] = useState<Config | null>(null);

  useEffect(() => {
    if (state.status !== "ok") return;
    api<Config>("/api/console/super/config").then(setCfg).catch(() => {});
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
        title="Configuration"
        subtitle="What's wired up. Values are never shown — only configured-or-not."
      />

      {cfg && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(cfg.runtime).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-[13px]"
              >
                <span className="text-slate-400">{k.replace(/([A-Z])/g, " $1")}</span>{" "}
                <span className="font-mono text-emerald-300">{v}</span>
              </span>
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2">
            <ul className="divide-y divide-slate-800/60">
              {Object.entries(cfg.secrets).map(([key, on]) => (
                <li
                  key={key}
                  className="flex items-center justify-between px-3 py-2.5 text-[13px]"
                >
                  <span className="capitalize text-slate-300">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  {on ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={14} /> configured
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <MinusCircle size={14} /> not set
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </ConsoleShell>
  );
}
