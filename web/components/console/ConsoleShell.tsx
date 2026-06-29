"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Flag,
  ScrollText,
  Users,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Receipt,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { roleSatisfies, type Operator, type Role } from "./useOperator";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; need: Role };

// One nav list for the whole console; each item declares the minimum role it
// needs and we render only what the current operator can use. (The server still
// enforces access on every call — this is just UX.)
const NAV: NavItem[] = [
  { href: "/console/dev", label: "Diagnostics", icon: Activity, need: "developer" },
  { href: "/console/dev/errors", label: "Errors", icon: AlertTriangle, need: "developer" },
  { href: "/console/dev/flags", label: "Feature flags", icon: Flag, need: "developer" },
  { href: "/console/dev/audit", label: "Audit log", icon: ScrollText, need: "developer" },
  { href: "/console/admin", label: "Operations", icon: LayoutDashboard, need: "admin" },
  { href: "/console/admin/users", label: "Users", icon: Users, need: "admin" },
  { href: "/console/admin/orders", label: "Orders", icon: Receipt, need: "admin" },
  { href: "/console/admin/support", label: "Support", icon: LifeBuoy, need: "admin" },
  { href: "/console/super", label: "Super-admin", icon: ShieldCheck, need: "super_admin" },
];

const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  developer: "Developer",
  admin: "Admin",
  super_admin: "Super-admin",
};

export function ConsoleShell({
  operator,
  children,
}: {
  operator: Operator;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/console/login");
  }

  const items = NAV.filter((n) => roleSatisfies(operator.role, n.need));

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2 px-5 py-5">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span className="text-[14px] font-semibold text-slate-100">Console</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((n) => {
            const active =
              pathname === n.href ||
              // Index routes match exactly; deeper routes also light up on their
              // children (e.g. /console/admin/users/:id keeps "Users" active).
              (n.href !== "/console/dev" &&
                n.href !== "/console/admin" &&
                pathname.startsWith(`${n.href}/`));
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-emerald-600/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                )}
              >
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 px-4 py-4">
          <p className="truncate text-[13px] font-medium text-slate-200">
            {operator.name}
          </p>
          <p className="truncate text-[11px] text-emerald-400">
            {ROLE_LABEL[operator.role]}
          </p>
          <button
            onClick={signOut}
            className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-7">{children}</main>
    </div>
  );
}

// Small primitives used across console pages.
export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {subtitle && <p className="mt-1 text-[13px] text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-slate-100",
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-rose-400",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="text-[12px] text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
