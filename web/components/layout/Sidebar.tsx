"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  History,
  Car,
  Utensils,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  X,
  Sparkles,
  Compass,
  Users,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/i18n/I18nContext";
import { useAuth } from "@/components/auth/AuthContext";
import { FlounaLogo } from "@/components/brand/FlounaLogo";

type ChatSessionSummary = { id: string; title: string | null };

const navItems: { href: string; label: string; icon: LucideIcon; isAI?: boolean }[] = [
  { href: "/ai", label: "FLOUNA AI", icon: Sparkles, isAI: true },
  { href: "/path", label: "My Path", icon: Compass },
  { href: "/mentors", label: "Mentors", icon: Users },
  { href: "/journey", label: "Journey", icon: Flame },
  { href: "/home", label: "Workspace", icon: Home },
  { href: "/history", label: "History", icon: History },
];

const guestNavItems = [
  { href: "/ai", label: "FLOUNA AI", icon: Sparkles },
  { href: "/path", label: "Discover Paths", icon: Compass },
  { href: "/mentors", label: "Mentor Network", icon: Users },
  { href: "/journey", label: "30-Day Plan", icon: Flame },
  { href: "/legal/terms", label: "Terms", icon: History },
  { href: "/legal/privacy", label: "Policy", icon: History },
];

const COLLAPSE_KEY = "flouna-sidebar-collapsed";
const COLLAPSE_EVENT = "flouna-sidebar-collapse";

function subscribeCollapse(cb: () => void) {
  window.addEventListener(COLLAPSE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

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
  const { user } = useAuth();
  const [recent, setRecent] = useState<ChatSessionSummary[]>([]);
  const [showAll, setShowAll] = useState(false);
  // Collapse preference lives in localStorage (SSR renders expanded).
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
    () => false,
  );

  function toggleCollapsed() {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  }

  // Refresh the list whenever navigation happens (a new chat updates the URL).
  // Skipped entirely for a guest — there's no session to list, and no point
  // firing a request that can only come back 401.
  //
  // Depends on user?.id rather than user itself: the auth check re-runs
  // (a silent refresh, React re-fetching after StrictMode's dev-only double
  // effect) and hands back a new object each time even when nothing about
  // the session actually changed, which was re-firing this fetch — visibly,
  // since the list re-renders on every one of those "changes" without one.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api<{ sessions: ChatSessionSummary[] }>("/api/chat/sessions")
      .then((d) => setRecent(d.sessions))
      .catch(() => setRecent([]));
  }, [pathname, searchParams, userId]);

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
          "fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col bg-cream px-4 py-5 transition-transform",
          "lg:static lg:translate-x-0 lg:shrink-0 lg:border-r lg:border-line lg:transition-[width] lg:duration-200",
          collapsed ? "lg:w-[96px] lg:px-3" : "lg:w-[300px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand row + collapse toggle */}
        <div
          className={cn(
            "flex items-center",
            collapsed ? "lg:flex-col lg:gap-3" : "justify-between",
          )}
        >
          <Link
            href="/home"
            aria-label="Flouna home"
            className="flex min-w-0 items-center gap-2.5"
          >
            <FlounaLogo size={30} className="shrink-0 text-cocoa/70" />
            <span
              className={cn(
                "truncate text-[17px] font-bold text-ink",
                collapsed && "lg:hidden",
              )}
            >
              Flouna
            </span>
          </Link>
          <button
            onClick={toggleCollapsed}
            className="hidden size-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent transition-colors hover:bg-accent/15 lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-cocoa hover:bg-beige lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* New conversation — outlined pill, Figma's deeper #b33b06 stroke
            rather than the brand accent. */}
        <Link
          href="/home"
          onClick={onClose}
          title={t("nav.newChat")}
          className={cn(
            "mt-6 flex h-[58px] items-center justify-center gap-2 rounded-pill border border-send bg-transparent text-[17px] font-bold text-ink transition-colors hover:bg-accent-soft/60",
            collapsed && "lg:h-12 lg:px-0",
          )}
        >
          {collapsed ? (
            <MessageSquare size={19} className="text-ink lg:block" />
          ) : (
            <>
              <Plus size={19} className="text-ink" />
              New Conversation
            </>
          )}
        </Link>

        {/* Nav card — the signed-in destinations, or legal/settings links for a
            guest (Figma's signed-out frame draws no chat nav, since there's no
            account to attach recent chats to). It carries its own top margin:
            the section heading that used to sit above it, and provide that
            gap, has been removed. */}
        <nav
          className={cn(
            "mt-6 overflow-hidden rounded-[20px] bg-card shadow-soft",
            collapsed && "lg:bg-transparent lg:shadow-none",
          )}
        >
          {user
            ? navItems.map(({ href, label, icon: Icon, isAI }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    title={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 transition-colors group",
                      active
                        ? isAI
                          ? "bg-flouna-orange-soft/70"
                          : "bg-accent-soft/70"
                        : "hover:bg-beige/40",
                      collapsed && "lg:justify-center lg:px-0",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
                        isAI
                          ? active
                            ? "bg-flouna-maroon text-white"
                            : "bg-flouna-maroon-soft text-flouna-maroon group-hover:bg-flouna-orange-soft"
                          : "bg-acct-tint text-ink",
                      )}
                    >
                      <Icon size={19} className={cn(isAI && !active ? "text-flouna-maroon" : "")} />
                    </span>
                    <span
                      className={cn(
                        "flex-1 truncate text-[16px] text-ink",
                        active && "font-bold",
                        isAI && "font-serif text-[17px] font-bold text-flouna-maroon",
                        collapsed && "lg:hidden",
                      )}
                    >
                      {label}
                    </span>
                    {isAI && (
                      <span className={cn("rounded-full bg-flouna-orange-soft px-2 py-0.5 text-[10px] font-bold text-flouna-maroon", collapsed && "lg:hidden")}>
                        ✦ AI
                      </span>
                    )}
                    <ChevronRight
                      size={17}
                      className={cn("shrink-0 text-muted/60", collapsed && "lg:hidden")}
                    />
                  </Link>
                );
              })
            : guestNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3.5 text-[16px] text-ink transition-colors hover:bg-beige/40"
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && <Icon size={17} className="text-muted" />}
                    <span>{label}</span>
                  </div>
                  <ChevronRight size={17} className="shrink-0 text-muted/60" />
                </Link>
              ))}
        </nav>

        {/* Recent chats fill the band the design leaves empty on a fresh account */}
        <div
          className={cn(
            "mt-5 min-h-0 flex-1 overflow-y-auto",
            collapsed && "lg:invisible",
          )}
        >
          {recent.length > 0 && (
            <>
              <p className="px-1 text-[13px] font-bold text-muted">
                Recent Chats
              </p>
              <div className="mt-2 flex flex-col gap-0.5">
                {visible.map((s) => (
                  <Link
                    key={s.id}
                    href={`/home?chat=${s.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 truncate rounded-[12px] px-3 py-2 text-[14px] text-ink/80 transition-colors hover:bg-beige/50"
                  >
                    <MessageSquare size={14} className="shrink-0 text-muted" />
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
            </>
          )}
        </div>

        {/* Foot: profile card for an account, Login/Signup + a language
            shortcut for a guest (Figma's signed-out frame) — the "अ" glyph
            circle is a language switcher, so it opens the same picker
            Settings already has rather than duplicating one here. */}
        {user ? (
          <div className={cn("mt-4 flex items-center gap-2.5", collapsed && "lg:flex-col")}>
            <Link
              href="/profile"
              onClick={onClose}
              title={t("nav.profile")}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-line bg-card p-3 shadow-soft transition-colors hover:bg-beige/30",
                collapsed && "lg:w-full lg:flex-none lg:justify-center lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none",
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[15px] font-bold text-accent">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  (user.name?.trim()?.[0] ?? "?").toUpperCase()
                )}
              </span>
              <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
                <span className="block truncate text-[16px] font-bold text-ink">
                  {user.name ?? "Your account"}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  View profile
                </span>
              </span>
              <ChevronRight
                size={17}
                className={cn("shrink-0 text-muted/60", collapsed && "lg:hidden")}
              />
            </Link>
            {/* Figma pairs the profile card with a language shortcut here
                too, not just on the signed-out foot — same picker, opened
                from Settings rather than duplicated. The glyph itself (not
                a translate icon) is what the design actually draws. */}
            <Link
              href="/profile/settings"
              onClick={onClose}
              aria-label="Language"
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-[18px] border border-line bg-card text-[18px] font-bold text-ink shadow-soft transition-colors hover:bg-beige/30",
                collapsed && "lg:hidden",
              )}
            >
              अ
            </Link>
          </div>
        ) : (
          <div className={cn("mt-4 flex items-center gap-2.5", collapsed && "lg:flex-col")}>
            <Link
              href="/login"
              onClick={onClose}
              className="flex h-[52px] flex-1 items-center justify-center rounded-pill border border-line bg-card text-[15px] font-bold text-ink shadow-soft transition-colors hover:bg-beige/30"
            >
              <span className={cn(collapsed && "lg:hidden")}>Login or Signup</span>
            </Link>
            <Link
              href="/profile/settings"
              onClick={onClose}
              aria-label="Language"
              className="flex size-[52px] shrink-0 items-center justify-center rounded-[18px] border border-line bg-card text-[20px] font-bold text-ink shadow-soft transition-colors hover:bg-beige/30"
            >
              अ
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
