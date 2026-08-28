"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { PriceAlertListener } from "@/components/alerts/PriceAlertListener";
import { useAuth } from "@/components/auth/AuthContext";

// Layout for all signed-in screens: persistent sidebar on desktop, hamburger
// drawer on mobile — one codebase, two views. The drawer is the single
// navigation surface (no bottom tab bar), matching the design.
//
// The mobile bar follows Figma 2177:4763: hamburger left, wordmark centred,
// avatar right. The wordmark is centred against the viewport rather than laid
// out between the two controls, so it stays optically centred even when a
// screen passes a title through.
export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  // The account screens are drawn on their own near-white grey rather than the
  // app cream. The sticky header sits directly above them, so it has to take
  // the same ground or a hard colour seam shows across the top of the page.
  const onAccountGround = pathname.startsWith("/profile");

  return (
    <div className="flex min-h-dvh w-full">
      <PriceAlertListener />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-3 px-4 backdrop-blur lg:hidden ${
            // Near-opaque: at 90% the chat's own chips read straight through
            // the bar as it scrolls under, which looks like a layering fault
            // rather than a frosted header.
            onAccountGround ? "bg-acct-bg/97" : "bg-cream/97"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-1 rounded-full p-2 text-ink transition-colors hover:bg-beige"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>

          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[19px] font-bold text-ink">
            {title ?? "Flouna"}
          </span>

          {user ? (
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[14px] font-bold text-accent"
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                (user.name?.trim()?.[0] ?? "?").toUpperCase()
              )}
            </Link>
          ) : (
            // Figma's signed-out header swaps the avatar for a Login pill —
            // not reachable while (app) sits behind RequireAuth, but this
            // component doesn't own that gate, so it stays correct for
            // whenever it does allow an anonymous visitor through.
            <Link
              href="/login"
              className="shrink-0 rounded-pill bg-card px-4 py-1.5 text-[13px] font-bold text-ink shadow-soft transition-colors hover:bg-beige/40"
            >
              Login
            </Link>
          )}
        </header>

        <main className="flex-1 pb-6">{children}</main>
      </div>
    </div>
  );
}
