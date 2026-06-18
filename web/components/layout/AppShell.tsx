"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { PriceAlertListener } from "@/components/alerts/PriceAlertListener";

// Layout for all signed-in screens: persistent sidebar on desktop,
// hamburger drawer on mobile — one codebase, two views. The drawer is the
// single navigation surface (no bottom tab bar), matching the design.
export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full">
      <PriceAlertListener />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-cream/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-full p-2 text-ink hover:bg-beige"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          {title && <h1 className="text-[16px] font-semibold">{title}</h1>}
        </header>

        <main className="flex-1 pb-6">{children}</main>
      </div>
    </div>
  );
}
