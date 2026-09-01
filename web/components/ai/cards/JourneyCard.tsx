"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Target, Zap } from "lucide-react";
import type { JourneyProgress } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

type JourneyCardProps = {
  progress: JourneyProgress;
  className?: string;
};

export function JourneyCard({ progress, className }: JourneyCardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-5",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
            Your Active Horizon
          </span>
          <h3 className="font-serif text-[22px] font-bold text-flouna-maroon">
            {progress.activePathTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-flouna-orange-soft px-3 py-1 text-[12px] font-bold text-flouna-maroon border border-flouna-orange/30">
            <Flame size={13} className="text-flouna-orange fill-flouna-orange" />
            {progress.streakDays} Day Streak
          </span>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-flouna-charcoal">
            Overall Roadmap Completion
          </span>
          <span className="font-mono font-bold text-flouna-maroon">
            {progress.overallPercentage}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-flouna-grey-soft/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-flouna-maroon via-flouna-orange to-flouna-orange-bright transition-all duration-1000 ease-out"
            style={{ width: `${progress.overallPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[12px] text-flouna-grey-mid">
          <span>Current focus: <strong>{progress.currentFocus}</strong></span>
          <span>{progress.completedTasksCount}/{progress.totalTasksCount} milestones reached</span>
        </div>
      </div>

      {/* Next Best Move Callout */}
      <div className="rounded-[16px] border border-flouna-maroon/20 bg-flouna-warm-white p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-flouna-maroon text-[11px] font-bold uppercase tracking-wider">
          <Zap size={14} className="text-flouna-orange fill-flouna-orange" />
          <span>Next Recommended Move</span>
        </div>

        <h4 className="font-serif text-[18px] font-bold text-flouna-maroon">
          {progress.nextBestMove.title}
        </h4>

        <p className="text-[13px] text-flouna-charcoal/80 leading-relaxed">
          {progress.nextBestMove.description}
        </p>

        <div className="pt-2">
          <Link
            href={progress.nextBestMove.actionHref}
            className="inline-flex items-center gap-1.5 rounded-pill bg-flouna-maroon px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-flouna-maroon-dark hover:shadow-sm"
          >
            <span>{progress.nextBestMove.actionLabel}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Proactive Insights List */}
      <div className="space-y-2 pt-2 border-t border-flouna-grey-soft/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid">
          Proactive Signals
        </span>
        <ul className="space-y-1.5 text-[13px] text-flouna-charcoal/90">
          {progress.proactiveInsights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-flouna-orange" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
