"use client";

import React, { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

type AIThinkingStateProps = {
  steps?: string[];
  className?: string;
};

const DEFAULT_STEPS = [
  "Understanding your goal",
  "Connecting your background & signals",
  "Evaluating verified career pathways",
  "Preparing your personalized next steps",
];

export function AIThinkingState({ steps = DEFAULT_STEPS, className }: AIThinkingStateProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentStepIndex < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, steps.length]);

  return (
    <div
      className={cn(
        "rounded-[18px] border border-flouna-grey-soft bg-flouna-warm-white p-4 shadow-sm max-w-lg transition-all",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-flouna-orange/15 text-flouna-orange">
          <Sparkles size={13} className="animate-spin" style={{ animationDuration: "3s" }} />
        </span>
        <span className="text-[13px] font-semibold tracking-wide uppercase text-flouna-maroon">
          FLOUNA Intelligence at work
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2.5 text-[13px] transition-all duration-300",
                isDone && "text-flouna-charcoal/80",
                isCurrent && "text-flouna-maroon font-medium translate-x-1",
                isPending && "text-flouna-grey-mid/60"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors",
                  isDone && "bg-flouna-maroon text-white",
                  isCurrent && "border border-flouna-orange text-flouna-orange bg-flouna-orange/10",
                  isPending && "border border-flouna-grey-soft bg-transparent"
                )}
              >
                {isDone ? (
                  <Check size={10} strokeWidth={3} />
                ) : isCurrent ? (
                  <span className="size-1.5 rounded-full bg-flouna-orange animate-pulse" />
                ) : null}
              </span>
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
