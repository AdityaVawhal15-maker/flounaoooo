"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";
import type { CareerPath } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

type PathCardProps = {
  path: CareerPath;
  onSelect?: (path: CareerPath) => void;
  featured?: boolean;
};

export function PathCard({ path, onSelect, featured = false }: PathCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-[20px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm transition-all hover:shadow-md hover:border-flouna-maroon/20",
        featured && "ring-1 ring-flouna-orange/30 bg-flouna-warm-white"
      )}
    >
      {/* Top Header: Tag & Match Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-flouna-maroon-soft px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase text-flouna-maroon">
            {path.category}
          </span>
          {path.demandTrend && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-flouna-orange">
              <TrendingUp size={12} />
              {path.demandTrend}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-flouna-orange/30 bg-flouna-orange-soft px-3 py-1 text-flouna-maroon">
          <Sparkles size={13} className="text-flouna-orange" />
          <span className="text-[13px] font-bold">{path.fitScore}%</span>
          <span className="text-[11px] font-medium text-flouna-charcoal/70">FLOUNA fit</span>
        </div>
      </div>

      {/* Title & Tagline */}
      <div className="mt-3">
        <h3 className="font-serif text-[22px] font-bold text-flouna-maroon leading-tight">
          {path.title}
        </h3>
        <p className="mt-1 text-[14px] text-flouna-charcoal/80 leading-relaxed">
          {path.tagline}
        </p>
      </div>

      {/* Why This Fits (Core Signals) */}
      <div className="mt-4 rounded-[14px] bg-flouna-ivory/60 p-3.5 border border-flouna-grey-soft/60">
        <p className="text-[11px] font-bold uppercase tracking-wider text-flouna-maroon">
          Why this fits you
        </p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-flouna-charcoal">
          {path.whyFit.slice(0, 2).map((reason, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-flouna-orange" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Expandable Details: Strengths, Gaps, Projects */}
      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-flouna-grey-soft/80 text-[13px]">
          <div>
            <span className="font-bold text-flouna-maroon">Current Strengths:</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {path.currentStrengths.map((s) => (
                <span key={s} className="rounded-md bg-flouna-grey-soft/50 px-2 py-0.5 text-[12px] text-flouna-charcoal">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold text-flouna-orange">Skill Gaps to Close:</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {path.skillGaps.map((g) => (
                <span key={g} className="rounded-md bg-flouna-orange-soft px-2 py-0.5 text-[12px] text-flouna-maroon">
                  {g}
                </span>
              ))}
            </div>
          </div>

          {path.projectsToTry.length > 0 && (
            <div>
              <span className="font-bold text-flouna-maroon">Recommended First Project:</span>
              <p className="mt-0.5 text-flouna-charcoal/90">
                <strong>{path.projectsToTry[0].title}:</strong> {path.projectsToTry[0].description} ({path.projectsToTry[0].timeframe})
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[13px] font-medium text-flouna-grey-mid hover:text-flouna-maroon transition-colors"
        >
          <span>{expanded ? "Show less" : "Deep dive"}</span>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <div className="flex items-center gap-2">
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(path)}
              className="flex items-center gap-1.5 rounded-pill bg-flouna-maroon px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-flouna-maroon-dark hover:shadow-sm"
            >
              <span>Explore this path</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <Link
              href={`/path?slug=${path.slug}`}
              className="flex items-center gap-1.5 rounded-pill bg-flouna-maroon px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-flouna-maroon-dark hover:shadow-sm"
            >
              <span>Explore this path</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
