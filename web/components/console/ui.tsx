"use client";

import { Loader2 } from "lucide-react";
import { useOperator, type Role } from "./useOperator";
import { ConsoleShell } from "./ConsoleShell";
import { cn } from "@/lib/cn";

// Paise → "₹1,23,400" (Indian grouping).
export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

// Paise → compact "₹84.3L" / "₹3.2Cr" for big headline numbers.
export function rupeesCompact(paise: number): string {
  const r = paise / 100;
  if (r >= 1_00_00_000) return `₹${(r / 1_00_00_000).toFixed(1)}Cr`;
  if (r >= 1_00_000) return `₹${(r / 1_00_000).toFixed(1)}L`;
  if (r >= 1_000) return `₹${(r / 1_000).toFixed(1)}K`;
  return `₹${Math.round(r)}`;
}

// Gate + shell wrapper used by every console page: handles the loading/redirect
// states and renders the operator chrome once authorized. Children receive the
// authorized operator's role-bearing context implicitly via ConsoleShell.
export function ConsolePage({
  accept,
  children,
}: {
  accept: Role[];
  children: React.ReactNode;
}) {
  const state = useOperator(accept);
  if (state.status !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  return <ConsoleShell operator={state.operator}>{children}</ConsoleShell>;
}

export function Card({
  title,
  right,
  children,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          {title && <h2 className="text-[13px] font-semibold text-slate-200">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">{children}</tbody>
      </table>
    </div>
  );
}

type Tone = "green" | "blue" | "amber" | "red" | "purple" | "slate";
export function Badge({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  const map: Record<Tone, string> = {
    green: "bg-emerald-500/15 text-emerald-300",
    blue: "bg-sky-500/15 text-sky-300",
    amber: "bg-amber-500/15 text-amber-300",
    red: "bg-rose-500/15 text-rose-300",
    purple: "bg-violet-500/15 text-violet-300",
    slate: "bg-slate-700/40 text-slate-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", map[tone])}>
      {children}
    </span>
  );
}

// Horizontal bar chart row (domain breakdowns etc.).
export function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: string;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5">
      <span className="w-20 shrink-0 text-right text-[11px] capitalize text-slate-400">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-800">
        <div className="h-full rounded" style={{ width: `${max}%`, background: color }} />
      </div>
      <span className="w-16 shrink-0 text-right text-[11px] font-medium text-slate-300">{value}</span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-center text-[13px] text-slate-500">{children}</p>;
}
