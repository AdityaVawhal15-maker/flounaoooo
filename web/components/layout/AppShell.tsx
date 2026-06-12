"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

// Layout for all signed-in screens: persistent sidebar on desktop,
// hamburger drawer + bottom tabs on mobile — one codebase, two views.
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

        <main className="flex-1 pb-20 lg:pb-6">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
