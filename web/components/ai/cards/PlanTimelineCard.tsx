"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Milestone, Sparkles } from "lucide-react";
import type { LearningPlan } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

type PlanTimelineCardProps = {
  plan: LearningPlan;
  className?: string;
};

export function PlanTimelineCard({ plan, className }: PlanTimelineCardProps) {
  const [activeWeek, setActiveWeek] = useState(plan.weeks[3]?.weekNumber || 1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    plan.weeks.forEach((w) => {
      w.tasks.forEach((t) => {
        if (t.completed) map[t.id] = true;
      });
    });
    return map;
  });

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const selectedWeekData = plan.weeks.find((w) => w.weekNumber === activeWeek) || plan.weeks[0];

  const totalTasks = plan.weeks.reduce((acc, w) => acc + w.tasks.length, 0);
  const doneCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPercent = Math.round((doneCount / (totalTasks || 1)) * 100);

  return (
    <div
      className={cn(
        "rounded-[22px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-5",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-flouna-grey-soft/70">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
            30-Day Starting Plan
          </span>
          <h3 className="font-serif text-[22px] font-bold text-flouna-maroon">
            {plan.pathTitle}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase text-flouna-grey-mid">
              Progress
            </span>
            <p className="font-mono text-[14px] font-bold text-flouna-maroon">
              {doneCount}/{totalTasks} done ({progressPercent}%)
            </p>
          </div>
          <div className="h-8 w-1.5 rounded-full bg-flouna-grey-soft overflow-hidden">
            <div
              className="w-full bg-flouna-orange transition-all duration-500"
              style={{ height: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Week Phase Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {plan.weeks.map((w) => {
          const isActive = w.weekNumber === activeWeek;
          const weekDone = w.tasks.every((t) => completedTasks[t.id]);

          return (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => setActiveWeek(w.weekNumber)}
              className={cn(
                "flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-bold transition-all shrink-0",
                isActive
                  ? "bg-flouna-maroon text-white shadow-sm"
                  : weekDone
                  ? "bg-flouna-orange-soft text-flouna-maroon border border-flouna-orange/30"
                  : "bg-flouna-ivory text-flouna-charcoal border border-flouna-grey-soft hover:bg-flouna-grey-soft/50"
              )}
            >
              <span>{w.phase.split(" ")[1]}</span>
              {weekDone && <CheckCircle2 size={12} className="text-flouna-orange" />}
            </button>
          );
        })}
      </div>

      {/* Active Phase Details */}
      {selectedWeekData && (
        <div className="rounded-[16px] bg-flouna-warm-white p-4 border border-flouna-grey-soft/70 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase text-flouna-orange">
                Week {selectedWeekData.weekNumber} · {selectedWeekData.phase}
              </span>
              <h4 className="font-serif text-[18px] font-bold text-flouna-maroon">
                {selectedWeekData.title}
              </h4>
              <p className="mt-1 text-[13px] text-flouna-charcoal/80">
                {selectedWeekData.objective}
              </p>
            </div>
          </div>

          {/* Tasks checklist */}
          <div className="space-y-2 pt-2 border-t border-flouna-grey-soft/60">
            {selectedWeekData.tasks.map((task) => {
              const isChecked = !!completedTasks[task.id];

              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-[12px] p-2.5 transition-colors cursor-pointer border select-none",
                    isChecked
                      ? "bg-flouna-ivory/50 border-flouna-grey-soft/50 text-flouna-charcoal/60"
                      : "bg-white border-flouna-grey-soft hover:border-flouna-orange/40 text-flouna-charcoal"
                  )}
                >
                  <button
                    type="button"
                    aria-label="Toggle task"
                    className="mt-0.5 shrink-0 text-flouna-orange"
                  >
                    {isChecked ? (
                      <CheckCircle2 size={17} className="text-flouna-orange fill-flouna-orange/10" />
                    ) : (
                      <Circle size={17} className="text-flouna-grey-mid/60" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 text-[13px]">
                    <span className={cn(isChecked && "line-through opacity-70")}>
                      {task.title}
                    </span>
                    {task.resourceTitle && (
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-flouna-grey-mid">
                        <span className="rounded bg-flouna-grey-soft/60 px-1.5 py-0.5 font-medium text-flouna-maroon">
                          {task.resourceType}
                        </span>
                        <span>{task.resourceTitle}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={11} /> {task.estimatedHours}h
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestone */}
          <div className="flex items-center gap-2 rounded-[10px] bg-flouna-maroon-soft p-2.5 text-[12px] text-flouna-maroon">
            <Milestone size={15} className="shrink-0 text-flouna-orange" />
            <span>
              <strong>Phase Milestone:</strong> {selectedWeekData.milestone}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
