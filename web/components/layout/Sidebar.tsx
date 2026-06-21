"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  History,
  Pizza,
  Car,
  Plus,
  User,
  PenSquare,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/i18n/I18nContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

type ChatSessionSummary = { id: string; title: string | null };

// Matches the Figma sidebar: Home / History / Food / Rides (Shop is reachable
// via chat and the food/shop surfaces, but not a top-level sidebar item).
const navItems: { href: string; key: TranslationKey; icon: typeof Home }[] = [
  { href: "/home", key: "nav.home", icon: Home },
  { href: "/history", key: "nav.history", icon: History },
  { href: "/food", key: "nav.food", icon: Pizza },
  { href: "/rides", key: "nav.rides", icon: Car },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [recent, setRecent] = useState<ChatSessionSummary[]>([]);
  const [showAll, setShowAll] = useState(false);

  // Refresh the list whenever navigation happens (a new chat updates the URL).
  useEffect(() => {
    api<{ sessions: ChatSessionSummary[] }>("/api/chat/sessions")
      .then((d) => setRecent(d.sessions))
      .catch(() => setRecent([]));
  }, [pathname, searchParams]);

  const visible = showAll ? recent : recent.slice(0, 5);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-beige/60 backdrop-blur px-5 py-6 transition-transform",
          "lg:static lg:translate-x-0 lg:shrink-0 lg:border-r lg:border-line",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/home" className="text-[22px] font-bold text-ink">
            Radiues
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-cocoa hover:bg-beige lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <Link
          href="/home"
          onClick={onClose}
          className="mt-6 flex h-12 items-center justify-center gap-2 rounded-pill border border-line bg-card text-[14px] font-semibold text-ink shadow-soft transition-colors hover:bg-beige/40"
        >
          <Plus size={16} className="text-ink" />
          {t("nav.newChat")}
        </Link>

        <nav className="mt-6 flex flex-col gap-1.5">
          {navItems.map(({ href, key, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-pill px-4 py-3 text-[15px] transition-colors",
                  active
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-ink/85 hover:bg-card/70",
                )}
              >
                <Icon size={18} className={active ? "text-accent" : "text-cocoa"} />
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 text-[12px] font-semibold text-accent">
            Recent Chats
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {recent.length === 0 && (
              <p className="flex items-center gap-2 px-3 py-2 text-[13px] text-cocoa/70">
                <PenSquare size={14} />
                No chats yet
              </p>
            )}
            {visible.map((s) => (
              <Link
                key={s.id}
                href={`/home?chat=${s.id}`}
                onClick={onClose}
                className="flex items-center gap-2 truncate rounded-[10px] px-3 py-2 text-[13px] text-ink/80 transition-colors hover:bg-card/70"
              >
                <PenSquare size={13} className="shrink-0 text-cocoa/60" />
                <span className="truncate">{s.title ?? "New chat"}</span>
              </Link>
            ))}
            {recent.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="px-3 py-2 text-left text-[13px] font-semibold text-accent hover:underline"
              >
                Show all
              </button>
            )}
          </div>
        </div>

        <Link
          href="/profile"
          onClick={onClose}
          className="mt-4 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium text-ink hover:bg-card/70 transition-colors"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-card shadow-card">
            <User size={16} className="text-cocoa" />
          </span>
          {t("nav.profile")}
        </Link>
      </aside>
    </>
  );
}
