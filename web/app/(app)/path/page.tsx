"use client";

import React, { useState } from "react";
import { Compass, Sparkles, Filter, ArrowRight, CheckCircle2, ChevronRight, Scale } from "lucide-react";
import { CAREER_PATHS } from "@/lib/ai/knowledge";
import type { CareerPath } from "@/lib/ai/types";
import { PathCard } from "@/components/ai/cards/PathCard";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/cn";
import Link from "next/link";

export default function FindYourPathPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [comparingPaths, setComparingPaths] = useState<CareerPath[]>([
    CAREER_PATHS[0], // Product Management
    CAREER_PATHS[1], // Product Design
  ]);
  const [showComparison, setShowComparison] = useState(false);

  const categories = ["All", "Product", "Design", "Engineering", "Data & AI"];

  const filteredPaths = selectedCategory === "All"
    ? CAREER_PATHS
    : CAREER_PATHS.filter((p) => p.category === selectedCategory);

  const toggleCompare = (path: CareerPath) => {
    if (comparingPaths.some((p) => p.id === path.id)) {
      if (comparingPaths.length > 1) {
        setComparingPaths(comparingPaths.filter((p) => p.id !== path.id));
      }
    } else {
      if (comparingPaths.length >= 2) {
        setComparingPaths([comparingPaths[1], path]);
      } else {
        setComparingPaths([...comparingPaths, path]);
      }
    }
  };

  return (
    <div className="min-h-dvh flex-1 bg-flouna-ivory/40 px-4 py-8 sm:px-6 lg:px-10 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <FadeIn y={12} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-flouna-maroon/20 bg-flouna-warm-white px-3.5 py-1 text-flouna-maroon shadow-sm">
          <Compass size={15} className="text-flouna-orange" />
          <span className="text-[12px] font-bold uppercase tracking-wider">
            FLOUNA Path Intelligence
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="font-serif text-[34px] sm:text-[46px] font-bold text-flouna-maroon leading-[1.1] tracking-tight">
              Find Your Direction
            </h1>
            <p className="text-[16px] sm:text-[18px] text-flouna-charcoal/80 leading-relaxed">
              Discover evaluated career pathways tailored to your technical acumen, problem-solving style, and growth ambition.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className={cn(
                "flex items-center gap-2 rounded-pill px-5 py-2.5 text-[14px] font-semibold transition-all border shadow-sm",
                showComparison
                  ? "bg-flouna-maroon text-white border-flouna-maroon"
                  : "bg-flouna-pure-white text-flouna-maroon border-flouna-grey-soft hover:border-flouna-orange"
              )}
            >
              <Scale size={16} className={showComparison ? "text-flouna-orange" : "text-flouna-maroon"} />
              <span>{showComparison ? "Hide Comparison" : "Compare Paths"}</span>
            </button>
          </div>
        </div>
      </FadeIn>

      {/* Side-by-Side Comparison Matrix */}
      {showComparison && (
        <FadeIn className="rounded-[24px] border border-flouna-maroon/20 bg-flouna-pure-white p-6 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-flouna-grey-soft pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-flouna-orange">
                FLOUNA Comparative Analysis
              </span>
              <h3 className="font-serif text-[22px] font-bold text-flouna-maroon">
                Side-by-Side Path Alignment
              </h3>
            </div>
            <p className="text-[13px] text-flouna-grey-mid">
              Comparing {comparingPaths.map((p) => p.title).join(" vs ")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparingPaths.map((path) => (
              <div
                key={path.id}
                className="rounded-[18px] border border-flouna-grey-soft bg-flouna-warm-white p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-[20px] font-bold text-flouna-maroon">
                    {path.title}
                  </h4>
                  <span className="rounded-full bg-flouna-orange-soft px-3 py-0.5 text-[12px] font-bold text-flouna-maroon border border-flouna-orange/30">
                    {path.fitScore}% Fit
                  </span>
                </div>

                <p className="text-[13px] text-flouna-charcoal/85">
                  {path.description}
                </p>

                <div className="space-y-2 pt-2 border-t border-flouna-grey-soft/70">
                  <span className="text-[11px] font-bold uppercase text-flouna-maroon">
                    Core Strengths Utilized
                  </span>
                  <ul className="space-y-1 text-[12px] text-flouna-charcoal">
                    {path.currentStrengths.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-flouna-orange shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2 border-t border-flouna-grey-soft/70">
                  <span className="text-[11px] font-bold uppercase text-flouna-orange">
                    Key Skill Gaps
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {path.skillGaps.map((g, idx) => (
                      <span key={idx} className="rounded bg-flouna-orange-soft px-2 py-0.5 text-[11px] text-flouna-maroon">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <Link
                    href={`/journey?path=${path.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-pill bg-flouna-maroon py-2 text-[13px] font-semibold text-white hover:bg-flouna-maroon-dark transition-all"
                  >
                    <span>Build 30-Day Plan for {path.title.split(" ")[0]}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="text-[12px] font-bold uppercase tracking-wider text-flouna-grey-mid mr-2 flex items-center gap-1">
          <Filter size={13} />
          Filter:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "rounded-pill px-4 py-1.5 text-[13px] font-medium transition-all shrink-0",
              selectedCategory === cat
                ? "bg-flouna-maroon text-white shadow-sm font-semibold"
                : "bg-flouna-pure-white text-flouna-charcoal border border-flouna-grey-soft hover:bg-flouna-ivory"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Evaluated Paths */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPaths.map((path) => (
          <StaggerItem key={path.id}>
            <PathCard path={path} featured={path.id === "path-pm"} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
