"use client";

import React, { useState } from "react";
import { Check, MessageSquare, Sparkles, Star, UserCheck } from "lucide-react";
import type { Mentor } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

type MentorMatchCardProps = {
  mentor: Mentor;
  onConnect?: (mentor: Mentor) => void;
  className?: string;
};

export function MentorMatchCard({
  mentor,
  onConnect,
  className,
}: MentorMatchCardProps) {
  const [requested, setRequested] = useState(false);

  const handleConnect = () => {
    setRequested(true);
    if (onConnect) onConnect(mentor);
  };

  return (
    <div
      className={cn(
        "rounded-[20px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-4 hover:shadow-md transition-all",
        className
      )}
    >
      {/* Top row: Avatar + Name + Match Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative size-13 shrink-0 rounded-full overflow-hidden border border-flouna-grey-soft bg-flouna-ivory">
            {mentor.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mentor.avatar}
                alt={mentor.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center font-bold text-flouna-maroon bg-flouna-maroon-soft">
                {mentor.initials}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-serif text-[18px] font-bold text-flouna-maroon">
                {mentor.name}
              </h4>
            </div>
            <p className="text-[13px] font-medium text-flouna-charcoal/80">
              {mentor.role} · <span className="font-bold text-flouna-maroon">{mentor.company}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-flouna-orange/30 bg-flouna-orange-soft px-2.5 py-1 text-flouna-maroon text-[12px] font-bold shrink-0">
          <Sparkles size={12} className="text-flouna-orange" />
          <span>{mentor.matchScore}% match</span>
        </div>
      </div>

      {/* Why Recommended */}
      <div className="rounded-[12px] bg-flouna-ivory/60 p-3 border border-flouna-grey-soft/50 text-[13px]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
          Why FLOUNA recommended {mentor.name.split(" ")[0]}
        </p>
        <p className="mt-1 text-flouna-charcoal/90 leading-relaxed">
          {mentor.whyRecommended}
        </p>
      </div>

      {/* Featured Insight */}
      {mentor.featuredInsight && (
        <p className="italic text-[13px] text-flouna-charcoal/80 pl-3 border-l-2 border-flouna-orange">
          &ldquo;{mentor.featuredInsight}&rdquo;
        </p>
      )}

      {/* Domain Tags */}
      <div className="flex flex-wrap gap-1.5">
        {mentor.domains.map((d) => (
          <span
            key={d}
            className="rounded-full bg-flouna-grey-soft/50 px-2.5 py-0.5 text-[11px] font-medium text-flouna-charcoal"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Footer: Availability & Connect CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-flouna-grey-soft/60 text-[12px]">
        <span className="font-medium text-flouna-orange">
          {mentor.availability}
        </span>

        <button
          type="button"
          onClick={handleConnect}
          disabled={requested}
          className={cn(
            "flex items-center gap-1.5 rounded-pill px-4 py-2 font-semibold text-[13px] transition-all",
            requested
              ? "bg-flouna-grey-soft text-flouna-charcoal"
              : "bg-flouna-maroon text-white hover:bg-flouna-maroon-dark hover:shadow-sm"
          )}
        >
          {requested ? (
            <>
              <Check size={14} />
              <span>Request Sent</span>
            </>
          ) : (
            <>
              <MessageSquare size={14} />
              <span>Connect with mentor</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
