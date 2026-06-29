import type { Metadata } from "next";

// The back-office console is a separate surface from the consumer app: its own
// dark "operator" theme, no PWA chrome, and explicitly NOT indexed. Server-side
// RBAC is the real gate — this layout only keeps the two experiences visually
// and structurally apart (and ready to split to admin.radiues.app at deploy).
export const metadata: Metadata = {
  title: { default: "Radiues Console", template: "%s · Radiues Console" },
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 [color-scheme:dark]">
      {children}
    </div>
  );
}
