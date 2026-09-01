"use client";

import React, { useState } from "react";
import { ArrowUpRight, Flame, Plus, Check } from "lucide-react";
import type { SkillProfile } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

type SkillProfileCardProps = {
  skills: SkillProfile[];
  onAddLeverToPlan?: (leverSkill: string) => void;
  className?: string;
};

export function SkillProfileCard({
  skills,
  onAddLeverToPlan,
  className,
}: SkillProfileCardProps) {
  const [addedSkills, setAddedSkills] = useState<Record<string, boolean>>({});

  const handleAdd = (skillName: string) => {
    setAddedSkills((prev) => ({ ...prev, [skillName]: true }));
    if (onAddLeverToPlan) onAddLeverToPlan(skillName);
  };

  const primaryLever = skills[0]?.nextLever;

  return (
    <div
      className={cn(
        "rounded-[20px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
            Intelligence Matrix
          </span>
          <h3 className="font-serif text-[20px] font-bold text-flouna-maroon">
            Your Skill Profile
          </h3>
        </div>
        <span className="rounded-full bg-flouna-ivory px-3 py-1 text-[12px] font-medium text-flouna-charcoal border border-flouna-grey-soft">
          4 Categories Tracked
        </span>
      </div>

      {/* Skill Bars */}
      <div className="space-y-3.5">
        {skills.map((s) => (
          <div key={s.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-flouna-charcoal">{s.category}</span>
              <span className="font-mono text-[12px] font-bold text-flouna-maroon">
                {s.score}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-flouna-grey-soft/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-flouna-maroon to-flouna-orange transition-all duration-700 ease-out"
                style={{ width: `${s.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Next Lever Callout */}
      {primaryLever && (
        <div className="rounded-[16px] border border-flouna-orange/30 bg-flouna-orange-soft/40 p-4 relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-flouna-orange text-[12px] font-bold uppercase tracking-wider">
            <Flame size={14} className="fill-flouna-orange text-flouna-orange" />
            <span>Your Next Highest-Impact Lever</span>
          </div>

          <h4 className="mt-1 font-serif text-[18px] font-bold text-flouna-maroon">
            {primaryLever.skill}
          </h4>

          <p className="mt-1 text-[13px] text-flouna-charcoal/85 leading-relaxed">
            {primaryLever.reason}
          </p>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-flouna-orange/20 text-[12px]">
            <span className="font-medium text-flouna-maroon">
              {primaryLever.expectedImpact}
            </span>

            <button
              type="button"
              onClick={() => handleAdd(primaryLever.skill)}
              disabled={addedSkills[primaryLever.skill]}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-pill px-3.5 py-1.5 font-semibold text-[12px] transition-all",
                addedSkills[primaryLever.skill]
                  ? "bg-flouna-grey-soft text-flouna-charcoal"
                  : "bg-flouna-maroon text-white hover:bg-flouna-maroon-dark hover:shadow-sm"
              )}
            >
              {addedSkills[primaryLever.skill] ? (
                <>
                  <Check size={13} />
                  <span>Added to plan</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Add to my 30-day plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
