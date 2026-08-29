"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

// Back-navigation that cannot loop.
//
// The bug this exists to prevent: a screen whose back button calls
// router.push(parent) does not go back at all — it pushes a NEW entry. So
// Help Centre → chat → "back" left the stack as [help, chat, help], and
// pressing back on Help Centre then went *forward* into the chat again, which
// pushed help again, forever. Any screen that pushes its parent as "back"
// creates that ping-pong.
//
// The rule this module enforces is that a back control only ever pops the
// stack, or replaces the current entry when there is nothing to pop. It never
// pushes. Browsers give no API for "is there in-app history?", so we record it
// ourselves: the tracker below marks the tab the first time it navigates
// between routes, which is exactly the condition under which router.back()
// is guaranteed to land somewhere inside the app.

const NAVIGATED_KEY = "flouna.hasNavigated";

/** Called by the tracker on every client-side route change after the first. */
export function markNavigated() {
  try {
    sessionStorage.setItem(NAVIGATED_KEY, "1");
  } catch {
    // Private mode or blocked storage: we simply fall back to the parent
    // route, which is always a correct destination even if it is not the
    // most recent one.
  }
}

export function hasNavigatedInApp() {
  try {
    return sessionStorage.getItem(NAVIGATED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Returns a handler for a back control.
 *
 * `fallback` is the screen this one belongs under — used when the tab opened
 * directly on this URL (a deep link, a shared link, an email), where there is
 * no in-app entry to return to. It is a `replace`, not a `push`, so the back
 * control never grows the history it is meant to unwind.
 */
export function useBackTo(fallback: string) {
  const router = useRouter();
  return useCallback(() => {
    if (hasNavigatedInApp()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
