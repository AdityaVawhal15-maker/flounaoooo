"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markNavigated } from "@/lib/navHistory";

// Records whether this tab has moved between routes yet.
//
// That single fact is what lets a back control choose correctly between
// popping the stack and falling back to a parent: if the tab has navigated at
// least once, router.back() is guaranteed to land somewhere inside the app; if
// it has not, the user arrived here directly and there is nothing to pop.
//
// Mounted once in the root layout so it covers the auth screens as well as the
// signed-in shell.
export function NavHistoryTracker() {
  const pathname = usePathname();
  // The first pathname is the entry point, not a navigation.
  const entry = useRef<string | null>(null);

  useEffect(() => {
    if (entry.current === null) {
      entry.current = pathname;
      return;
    }
    if (pathname !== entry.current) markNavigated();
  }, [pathname]);

  return null;
}
