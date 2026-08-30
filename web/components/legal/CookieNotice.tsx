"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";

// The cookie notice.
//
// Cookie policy 1.3 promises a choice over the non-essential categories, and
// 1.4 promises we honour Do Not Track. Both are handled here.
//
// The notice is honest about a slightly awkward fact: today Flouna sets two
// cookies and both are essential, so there is nothing here that anyone
// actually needs to refuse. It says so rather than performing a consent
// ceremony over tracking that does not exist. The choice is still recorded,
// because the policy reserves the right to those categories and the day one is
// switched on, the answer needs to already be there.
//
// What it must never be is a dark pattern. Reject is as easy to reach as
// accept, dismissing without choosing leaves everything off, and nothing is
// blocked behind the decision.

const STORAGE_KEY = "flouna.cookieNotice";

/**
 * Whether the browser is asking not to be tracked.
 *
 * Three spellings, because the property moved between vendors and the old ones
 * are still what some browsers set. Any of them meaning yes is treated as yes:
 * a request not to be tracked is not something to be pedantic about.
 */
function doNotTrackEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    doNotTrack?: string | null;
    navigator: Navigator & { msDoNotTrack?: string | null };
  };
  const signals = [
    w.navigator.doNotTrack,
    w.doNotTrack,
    w.navigator.msDoNotTrack,
  ];
  return signals.some((s) => s === "1" || s === "yes");
}

// localStorage genuinely is an external store, so it is read as one rather
// than copied into state by an effect. That also means the answer is correct
// on the very first render instead of one render late, which is the difference
// between the notice appearing and the notice appearing with a flicker.

function shouldAsk(): boolean {
  if (typeof window === "undefined") return false;
  // Do Not Track is an answer, so it is not also a question.
  if (doNotTrackEnabled()) return false;
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    // Unreadable storage means we ask rather than assume consent, which is
    // the safe direction to be wrong in.
    return true;
  }
}

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Another tab answering the notice should settle it here too.
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

// The server renders nothing: it cannot know what this browser has stored, and
// guessing would mean a hydration mismatch or a banner flashing at somebody
// who already answered.
const serverSnapshot = () => false;

const ALL_OFF = {
  analytics: false,
  advertising: false,
  social: false,
  performance: false,
};

const ALL_ON = {
  analytics: true,
  advertising: true,
  social: true,
  performance: true,
};

export function CookieNotice() {
  const { user } = useAuth();
  const visible = useSyncExternalStore(subscribe, shouldAsk, serverSnapshot);
  const box = useRef<HTMLDivElement>(null);

  // While the notice is up it sits over the foot of the page, and anything
  // underneath it cannot be tapped. On a phone that is regularly a form's
  // submit button, so the page is padded by exactly the notice's height and
  // the padding is removed the moment it goes.
  //
  // Measured rather than guessed at, because the copy wraps to a different
  // number of lines at different widths and in six languages.
  useEffect(() => {
    if (!visible) return;
    const el = box.current;
    if (!el) return;
    const apply = () => {
      document.body.style.paddingBottom = `${el.offsetHeight + 24}px`;
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

  // Records the fact that this browser asked not to be tracked. It does not
  // decide whether the notice shows, which shouldAsk already handled: this is
  // only so the reason is visible if anyone ever looks at why nothing was
  // asked here.
  useEffect(() => {
    if (!doNotTrackEnabled()) return;
    try {
      localStorage.setItem(STORAGE_KEY, "dnt");
    } catch {
      // A browser with storage blocked still behaves correctly; it simply
      // re-derives the same answer from the signal next time.
    }
  }, []);

  async function choose(choice: typeof ALL_OFF) {
    try {
      localStorage.setItem(STORAGE_KEY, "set");
    } catch {
      // Recording it on the account below is the durable half anyway.
    }
    notify();
    // Only persisted for a signed-in account: there is nobody to attach a
    // consent record to otherwise, and inventing an identifier to remember
    // the answer of someone who has not signed in would create exactly the
    // tracking the banner is asking about.
    if (user) {
      try {
        await api("/api/privacy/cookies", { method: "PUT", json: choice });
      } catch {
        // The local flag already stops the banner reappearing. A failed save
        // means the account keeps its previous choice, which defaults to off.
      }
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie choices"
      // pointer-events are re-enabled on the panel only, so the strip of
      // padding either side of it does not block the page behind.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div
        ref={box}
        className="pointer-events-auto mx-auto max-w-xl rounded-2xl border border-line bg-card p-4 shadow-lift"
      >
        <p className="text-[14px] font-bold text-ink">Cookies</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-cocoa">
          Flouna sets two cookies, both of which keep you signed in. We do not
          currently use analytics, advertising or social cookies. You can decide
          now in case we ever do, and change it any time in your settings.{" "}
          <Link href="/legal/cookies" className="font-medium text-accent underline">
            Cookie policy
          </Link>
        </p>
        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
          {/* Reject sits first and is styled no more quietly than accept.
              A refusal that takes more effort than agreement is not a choice
              that was freely given, and DPDP asks for one that is. */}
          <button
            type="button"
            onClick={() => choose(ALL_OFF)}
            className="tap-target flex-1 rounded-pill border border-line px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-beige/50"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => choose(ALL_ON)}
            className="tap-target flex-1 rounded-pill bg-accent px-4 py-2.5 text-[14px] font-bold text-white"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
