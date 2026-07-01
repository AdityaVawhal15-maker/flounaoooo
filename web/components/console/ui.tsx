"use client";

import { Loader2 } from "lucide-react";
import { useOperator, type Role } from "./useOperator";
import { ConsoleShell } from "./ConsoleShell";

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
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ color: "var(--c-maroon)" }}
      >
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
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ border: "1px solid var(--c-border)" }}
    >
      {(title || right) && (
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--c-border)" }}
        >
          {title && (
            <h2 className="text-[13px] font-bold" style={{ color: "var(--c-ink)" }}>
              {title}
            </h2>
          )}
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
        <thead style={{ background: "#FBF8F2" }}>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="c-label whitespace-nowrap px-4 py-2.5 text-[10.5px]"
                style={{ color: "var(--c-muted)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-t [&>tr]:border-[var(--c-line)]">{children}</tbody>
      </table>
    </div>
  );
}

type Tone = "green" | "blue" | "amber" | "red" | "purple" | "slate";
export function Badge({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  const map: Record<Tone, { bg: string; fg: string }> = {
    green: { bg: "#E5F3EA", fg: "#1A7A4A" },
    blue: { bg: "#EAF1FB", fg: "#2E6DB4" },
    amber: { bg: "#FEF3DC", fg: "#B8690A" },
    red: { bg: "#F6E7E5", fg: "#C0392B" },
    purple: { bg: "#EFE9F6", fg: "#6D28D9" },
    slate: { bg: "#F0EADF", fg: "#8A8178" },
  };
  const s = map[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  );
}

// Horizontal bar row (small inline breakdowns; recharts handles the big charts).
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
      <span
        className="w-20 shrink-0 text-right text-[11px] capitalize"
        style={{ color: "var(--c-muted)" }}
      >
        {label}
      </span>
      <div
        className="h-4 flex-1 overflow-hidden rounded"
        style={{ background: "var(--c-ivory)", border: "1px solid var(--c-border)" }}
      >
        <div className="h-full rounded" style={{ width: `${max}%`, background: color }} />
      </div>
      <span
        className="w-16 shrink-0 text-right text-[11px] font-medium"
        style={{ color: "var(--c-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-12 text-center text-[13px]" style={{ color: "var(--c-muted)" }}>
      {children}
    </p>
  );
}
