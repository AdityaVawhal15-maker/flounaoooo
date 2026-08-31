"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

// ChatGPT/Claude-style "what the AI is doing" trace. Steps reveal one by one
// and complete, so the user sees the work happening (builds trust). This is a
// presentation layer — when real ONDC/live search is wired, swap STEPS for the
// actual tool-use events streamed from the backend.
const STEPS = [
  "Understanding your request",
  "Comparing options across providers",
  "Applying offers and coupons",
  "Picking the best for you",
];

const STEP_MS = 700;

// A greeting or a plain question isn't a price comparison — showing the full
// "comparing across providers" trace for "hello" reads as fake work. Those get
// a single neutral line instead.
export function ThinkingSteps({ simple = false }: { simple?: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (simple) return;
    const t = setInterval(() => {
      setActive((a) => (a < STEPS.length - 1 ? a + 1 : a));
    }, STEP_MS);
    return () => clearInterval(t);
  }, [simple]);

  if (simple) {
    // The pill from the design. Deliberately says "Searching" rather than
    // "Thinking": what the engine is doing at this moment is looking across
    // providers, and naming the actual work is more reassuring than naming the
    // wait. The step-by-step trace still runs for real comparisons.
    return (
      <div className="flex w-fit items-center gap-2 rounded-pill border border-line bg-card px-3.5 py-2 text-[13px] shadow-soft">
        <Sparkles size={14} className="shrink-0 animate-pulse text-accent" />
        <span className="font-medium text-ink">
          Searching
          <ThinkingDots />
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 pl-1">
      {STEPS.map((label, i) => {
        const done = i < active;
        const current = i === active;
        if (i > active) return null; // reveal progressively
        return (
          <div
            key={label}
            className="flex animate-[fadeIn_0.3s_ease] items-center gap-2 text-[13px]"
          >
            {done ? (
              <Check size={14} className="shrink-0 text-success" />
            ) : (
              <Loader2 size={14} className="shrink-0 animate-spin text-accent" />
            )}
            <span className={done ? "text-cocoa/70" : "font-medium text-ink"}>
              {label}
              {current && <ThinkingDots />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ThinkingDots() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((v) => (v % 3) + 1), 400);
    return () => clearInterval(t);
  }, []);
  return <span className="text-cocoa/50">{".".repeat(n)}</span>;
}
