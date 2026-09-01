"use client";

import React, { useState } from "react";
import { Users, Sparkles, Search, MessageSquare, Check, Filter } from "lucide-react";
import { MENTORS } from "@/lib/ai/knowledge";
import type { Mentor } from "@/lib/ai/types";
import { MentorMatchCard } from "@/components/ai/cards/MentorMatchCard";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

export default function MentorsPage() {
  const [challengeQuery, setChallengeQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sentConnects, setSentConnects] = useState<Record<string, boolean>>({});

  const challenges = [
    "Preparing for Product Management interviews",
    "Transitioning from Software Engineering to Product",
    "Mastering Design Systems & Micro-interactions",
    "Designing Agentic LLM Orchestration",
    "Distributed Systems Performance & Scaling",
  ];

  const domains = ["All", "Product Strategy", "Design Systems", "AI Orchestration", "Distributed Systems", "Product Growth"];

  const filteredMentors = MENTORS.filter((m) => {
    const matchesDomain = activeFilter === "All" || m.domains.some((d) => d.toLowerCase().includes(activeFilter.toLowerCase()));
    const matchesQuery = challengeQuery === "" ||
      m.name.toLowerCase().includes(challengeQuery.toLowerCase()) ||
      m.domains.some((d) => d.toLowerCase().includes(challengeQuery.toLowerCase())) ||
      m.whyRecommended.toLowerCase().includes(challengeQuery.toLowerCase()) ||
      m.bio.toLowerCase().includes(challengeQuery.toLowerCase());
    return matchesDomain && matchesQuery;
  });

  const handleConnect = (mentor: Mentor) => {
    setSentConnects((prev) => ({ ...prev, [mentor.id]: true }));
  };

  return (
    <div className="min-h-dvh flex-1 bg-flouna-ivory/40 px-4 py-8 sm:px-6 lg:px-10 space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <FadeIn y={12} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-flouna-maroon/20 bg-flouna-warm-white px-3.5 py-1 text-flouna-maroon shadow-sm">
          <Users size={15} className="text-flouna-orange" />
          <span className="text-[12px] font-bold uppercase tracking-wider">
            FLOUNA Mentor Intelligence
          </span>
        </div>

        <div className="space-y-2 max-w-3xl">
          <h1 className="font-serif text-[34px] sm:text-[46px] font-bold text-flouna-maroon leading-[1.1] tracking-tight">
            Connect with Someone <br />
            <span className="italic text-flouna-charcoal">Who Has Walked the Path.</span>
          </h1>
          <p className="text-[16px] sm:text-[18px] text-flouna-charcoal/80 leading-relaxed">
            AI understands your trajectory; human mentors provide the lived experience and calibration. FLOUNA matches you with top-tier practitioners based on your active goals.
          </p>
        </div>
      </FadeIn>

      {/* Challenge Search Box */}
      <FadeIn delay={0.1} className="rounded-[24px] border border-flouna-grey-soft bg-flouna-pure-white p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-flouna-maroon">
          <Sparkles size={18} className="text-flouna-orange" />
          <h2 className="font-serif text-[18px] font-bold">
            Tell FLOUNA what challenge you are trying to solve
          </h2>
        </div>

        <div className="relative flex items-center gap-2 rounded-pill bg-flouna-warm-white border border-flouna-grey-soft px-4 py-2.5 shadow-sm focus-within:border-flouna-maroon/40 focus-within:ring-2 focus-within:ring-flouna-maroon/10">
          <Search size={18} className="text-flouna-grey-mid ml-1 shrink-0" />
          <input
            type="text"
            value={challengeQuery}
            onChange={(e) => setChallengeQuery(e.target.value)}
            placeholder="e.g. Preparing for product interview loops or architecting design systems..."
            className="flex-1 bg-transparent text-[15px] text-flouna-charcoal placeholder:text-flouna-grey-mid outline-none"
          />
          {challengeQuery && (
            <button
              type="button"
              onClick={() => setChallengeQuery("")}
              className="text-[12px] font-semibold text-flouna-grey-mid hover:text-flouna-maroon mr-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Challenge Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid shrink-0">
            Suggested Challenges:
          </span>
          {challenges.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChallengeQuery(c)}
              className="rounded-pill bg-flouna-ivory border border-flouna-grey-soft px-3 py-1 text-[12px] font-medium text-flouna-charcoal hover:border-flouna-orange hover:bg-flouna-orange-soft/50 hover:text-flouna-maroon transition-all shrink-0"
            >
              {c}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Domain Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <span className="text-[12px] font-bold uppercase tracking-wider text-flouna-grey-mid mr-2 flex items-center gap-1">
          <Filter size={13} />
          Domain:
        </span>
        {domains.map((dom) => (
          <button
            key={dom}
            type="button"
            onClick={() => setActiveFilter(dom)}
            className={cn(
              "rounded-pill px-4 py-1.5 text-[13px] font-medium transition-all shrink-0",
              activeFilter === dom
                ? "bg-flouna-maroon text-white shadow-sm font-semibold"
                : "bg-flouna-pure-white text-flouna-charcoal border border-flouna-grey-soft hover:bg-flouna-ivory"
            )}
          >
            {dom}
          </button>
        ))}
      </div>

      {/* Mentors Grid */}
      <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMentors.map((mentor) => (
          <StaggerItem key={mentor.id}>
            <MentorMatchCard mentor={mentor} onConnect={handleConnect} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
