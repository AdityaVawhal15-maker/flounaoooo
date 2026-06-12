"use client";

import { useState } from "react";
import { Share2, Check, Sparkles } from "lucide-react";
import { rupees } from "@/lib/money";

// Shareable proof-of-decision: what Radiues compared and what it saved.
export function DecisionReceipt({
  comparedOptions,
  comparedPlatforms,
  savedPaise,
  domain,
}: {
  comparedOptions: number;
  comparedPlatforms: number;
  savedPaise: number;
  domain: "food" | "ride";
}) {
  const [copied, setCopied] = useState(false);
  if (comparedOptions < 2) return null;

  const what = domain === "food" ? "my food order" : "my ride";
  const shareText =
    `Radiues compared ${comparedOptions} options across ${comparedPlatforms} platforms for ${what}` +
    (savedPaise > 0 ? ` and saved me ${rupees(savedPaise)}` : " and picked the best one") +
    ". Stop searching, start deciding 🔶";

  async function share() {
    if (navigator.share) {
      await navigator.share({ text: shareText }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-card border border-accent/40 bg-gradient-to-br from-accent-soft/80 to-cream p-4">
      <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-accent">
        <Sparkles size={13} /> Decision receipt
      </p>
      <p className="mt-2 text-[15px] font-bold leading-snug text-ink">
        Radiues compared {comparedOptions} options across {comparedPlatforms}{" "}
        platforms
        {savedPaise > 0 ? (
          <>
            {" "}
            and saved you{" "}
            <span className="text-accent">{rupees(savedPaise)}</span>
          </>
        ) : (
          " and picked the best one"
        )}
        .
      </p>
      <button
        onClick={share}
        className="mt-3 flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#d4570f]"
      >
        {copied ? <Check size={13} /> : <Share2 size={13} />}
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
