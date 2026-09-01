"use client";

import React, { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

type InsightCardProps = {
  title?: string;
  insight: string;
  explanation?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
};

export function InsightCard({
  title = "FLOUNA INSIGHT",
  insight,
  explanation = "Synthesized from your recent project submissions and mentor interactions.",
  actionText = "Why we think so →",
  onAction,
  className,
}: InsightCardProps) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div
      className={cn(
        "rounded-[18px] border border-flouna-grey-soft bg-flouna-pure-white p-4.5 shadow-sm space-y-2.5 transition-all hover:border-flouna-maroon/20",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="flex size-5 items-center justify-center rounded-full bg-flouna-orange-soft text-flouna-orange">
          <Sparkles size={11} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
          {title}
        </span>
      </div>

      <p className="font-serif text-[18px] font-medium text-flouna-charcoal leading-snug">
        {insight}
      </p>

      {showWhy && (
        <p className="text-[13px] text-flouna-charcoal/80 bg-flouna-ivory/80 p-2.5 rounded-[10px] border border-flouna-grey-soft/60">
          {explanation}
        </p>
      )}

      <div className="pt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setShowWhy(!showWhy);
            if (onAction) onAction();
          }}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-flouna-orange hover:text-flouna-maroon transition-colors"
        >
          <span>{showWhy ? "Hide reasoning" : actionText}</span>
        </button>
      </div>
    </div>
  );
}
