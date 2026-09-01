"use client";

import React from "react";
import { Flame, Sparkles, CheckCircle2, Calendar, Target, Zap, ArrowRight } from "lucide-react";
import { DEFAULT_LEARNING_PLAN, DEFAULT_JOURNEY_PROGRESS } from "@/lib/ai/knowledge";
import { PlanTimelineCard } from "@/components/ai/cards/PlanTimelineCard";
import { JourneyCard } from "@/components/ai/cards/JourneyCard";
import { InsightCard } from "@/components/ai/cards/InsightCard";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

export default function JourneyPage() {
  return (
    <div className="min-h-dvh flex-1 bg-flouna-ivory/40 px-4 py-8 sm:px-6 lg:px-10 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <FadeIn y={12} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-flouna-maroon/20 bg-flouna-warm-white px-3.5 py-1 text-flouna-maroon shadow-sm">
          <Flame size={15} className="text-flouna-orange fill-flouna-orange" />
          <span className="text-[12px] font-bold uppercase tracking-wider">
            FLOUNA Growth OS · Active Journey
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="font-serif text-[34px] sm:text-[46px] font-bold text-flouna-maroon leading-[1.1] tracking-tight">
              Your 30-Day Starting Plan
            </h1>
            <p className="text-[16px] sm:text-[18px] text-flouna-charcoal/80 leading-relaxed">
              Step-by-step milestones to translate your ambitions into validated artifacts, mentor feedback, and measurable career momentum.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-[18px] border border-flouna-grey-soft bg-flouna-pure-white px-5 py-3 shadow-sm text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid">
                Weekly Velocity
              </span>
              <p className="font-mono text-[16px] font-bold text-flouna-maroon">
                4 Milestones / Wk
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Grid Layout: Timeline Plan + Journey Dashboard */}
      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Plan Timeline */}
        <StaggerItem className="lg:col-span-2 space-y-6">
          <PlanTimelineCard plan={DEFAULT_LEARNING_PLAN} />

          <InsightCard
            title="MOMENTUM INSIGHT"
            insight="You are 72% through your 30-day foundation. Completing Week 4 unlocks 1:1 mentor endorsements."
            explanation="Based on your current completion rate across user research, metrics calculation, and PRD specification."
          />
        </StaggerItem>

        {/* Right 1 Col: Progress Summary & Signals */}
        <StaggerItem className="space-y-6">
          <JourneyCard progress={DEFAULT_JOURNEY_PROGRESS} />

          <div className="rounded-[20px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-flouna-maroon">
              <Target size={16} className="text-flouna-orange" />
              <h3 className="font-serif text-[18px] font-bold">
                Upcoming Phase Objective
              </h3>
            </div>
            <p className="text-[13px] text-flouna-charcoal/80 leading-relaxed">
              <strong>Phase 05: APPLY:</strong> Practice 5 classic Product Sense interview prompts with timed breakdowns and defensible frameworks.
            </p>
          </div>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
