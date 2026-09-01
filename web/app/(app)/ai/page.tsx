"use client";

import React, { useState } from "react";
import { Sparkles, Compass, Target, Users, Calendar, Flame, ArrowRight, RotateCcw } from "lucide-react";
import { AIAvatar } from "@/components/ai/AIAvatar";
import { AIComposer } from "@/components/ai/AIComposer";
import { AIThinkingState } from "@/components/ai/AIThinkingState";
import { PathCard } from "@/components/ai/cards/PathCard";
import { SkillProfileCard } from "@/components/ai/cards/SkillProfileCard";
import { MentorMatchCard } from "@/components/ai/cards/MentorMatchCard";
import { PlanTimelineCard } from "@/components/ai/cards/PlanTimelineCard";
import { JourneyCard } from "@/components/ai/cards/JourneyCard";
import { InsightCard } from "@/components/ai/cards/InsightCard";
import { processUserMessage } from "@/lib/ai/orchestrator";
import {
  CAREER_PATHS,
  SKILL_PROFILES,
  MENTORS,
  DEFAULT_LEARNING_PLAN,
  DEFAULT_JOURNEY_PROGRESS,
} from "@/lib/ai/knowledge";
import type { AIResponse } from "@/lib/ai/types";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/cn";

type ActiveTab = "overview" | "paths" | "skills" | "mentors" | "plan" | "journey";

export default function FlounaAIPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [conversation, setConversation] = useState<AIResponse[]>([]);
  const [thinking, setThinking] = useState(false);

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || thinking) return;

    // Optimistic user turn
    const userTurn: AIResponse = {
      id: `u-${Date.now()}`,
      message: msgText,
      intent: "general_guidance",
      thinkingSteps: [],
      suggestedActions: [],
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => [...prev, userTurn]);
    setThinking(true);

    try {
      const response = await processUserMessage(msgText);
      setConversation((prev) => [...prev, response]);
    } catch {
      setConversation((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          message: "FLOUNA encountered a brief interruption. Please try again.",
          intent: "general_guidance",
          thinkingSteps: [],
          suggestedActions: [{ label: "Retry", prompt: msgText }],
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="min-h-dvh flex-1 bg-flouna-ivory/50 px-4 py-8 sm:px-6 lg:px-10 space-y-10 max-w-7xl mx-auto">
      {/* Editorial Hero Section */}
      <FadeIn y={12} className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-flouna-maroon/20 bg-flouna-warm-white px-3.5 py-1 text-flouna-maroon shadow-sm">
          <AIAvatar size={18} active className="border-none bg-transparent" />
          <span className="text-[12px] font-bold uppercase tracking-wider">
            FLOUNA AI · Intelligence Command Center
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <h1 className="font-serif text-[34px] sm:text-[46px] lg:text-[54px] font-bold text-flouna-maroon leading-[1.1] tracking-tight">
              Let&apos;s figure out <br />
              <span className="italic text-flouna-charcoal">what comes next.</span>
            </h1>
            <p className="text-[16px] sm:text-[18px] text-flouna-charcoal/80 leading-relaxed">
              FLOUNA understands your goals, strengths, and ambitions to help you discover the right path, connect with verified mentors, and execute a high-momentum 30-day plan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-[18px] border border-flouna-grey-soft bg-flouna-pure-white px-4 py-3 shadow-sm text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid">
                Active Streak
              </span>
              <p className="flex items-center justify-end gap-1 font-mono text-[16px] font-bold text-flouna-maroon">
                <Flame size={16} className="text-flouna-orange fill-flouna-orange" />
                14 Days Active
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Main Composer Area */}
      <FadeIn delay={0.1} className="rounded-[24px] border border-flouna-grey-soft bg-flouna-pure-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-flouna-maroon">
            <Sparkles size={18} className="text-flouna-orange" />
            <h2 className="font-serif text-[20px] font-bold">
              Ask FLOUNA
            </h2>
          </div>
          {conversation.length > 0 && (
            <button
              type="button"
              onClick={() => setConversation([])}
              className="flex items-center gap-1 text-[12px] font-semibold text-flouna-grey-mid hover:text-flouna-maroon transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset conversation</span>
            </button>
          )}
        </div>

        <AIComposer
          onSend={handleSendMessage}
          disabled={thinking}
          placeholder="Ask FLOUNA about career fit, skill levers, mentor matches, or next steps..."
        />

        {/* Live Conversation Stream if messages exist */}
        {conversation.length > 0 && (
          <div className="mt-6 pt-6 border-t border-flouna-grey-soft space-y-6">
            {conversation.map((msg, index) => {
              const isUser = msg.id.startsWith("u-");

              return (
                <div
                  key={msg.id || index}
                  className={cn("flex flex-col space-y-3", isUser ? "items-end" : "items-start")}
                >
                  {isUser ? (
                    <div className="max-w-[80%] rounded-[20px] rounded-br-xs bg-flouna-maroon px-5 py-3 text-[15px] font-medium text-white shadow-sm">
                      {msg.message}
                    </div>
                  ) : (
                    <div className="w-full space-y-4 max-w-4xl">
                      <div className="flex items-start gap-3">
                        <AIAvatar size={34} active />
                        <div className="flex-1 space-y-4">
                          <div className="rounded-[20px] rounded-tl-xs border border-flouna-grey-soft bg-flouna-warm-white p-4.5 text-[15px] text-flouna-charcoal shadow-sm leading-relaxed">
                            {msg.message}
                          </div>

                          {msg.paths && msg.paths.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {msg.paths.map((p) => (
                                <PathCard key={p.id} path={p} />
                              ))}
                            </div>
                          )}

                          {msg.skills && msg.skills.length > 0 && (
                            <SkillProfileCard skills={msg.skills} />
                          )}

                          {msg.mentors && msg.mentors.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {msg.mentors.map((m) => (
                                <MentorMatchCard key={m.id} mentor={m} />
                              ))}
                            </div>
                          )}

                          {msg.plan && (
                            <PlanTimelineCard plan={msg.plan} />
                          )}

                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {msg.suggestedActions.map((action) => (
                                <button
                                  key={action.label}
                                  type="button"
                                  onClick={() => handleSendMessage(action.prompt)}
                                  className="rounded-pill bg-flouna-ivory border border-flouna-grey-soft px-4 py-1.5 text-[13px] font-medium text-flouna-charcoal hover:border-flouna-orange hover:bg-flouna-orange-soft hover:text-flouna-maroon transition-all"
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {thinking && (
              <div className="flex items-start gap-3">
                <AIAvatar size={34} active />
                <AIThinkingState />
              </div>
            )}
          </div>
        )}
      </FadeIn>

      {/* Intelligence Workspace Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-flouna-grey-soft pb-2">
        {[
          { id: "overview", label: "Intelligence Hub", icon: Sparkles },
          { id: "paths", label: "Path Discovery", icon: Compass },
          { id: "skills", label: "Skill Profile", icon: Target },
          { id: "mentors", label: "Mentor Network", icon: Users },
          { id: "plan", label: "30-Day Plan", icon: Calendar },
          { id: "journey", label: "Active Journey", icon: Flame },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as ActiveTab)}
            className={cn(
              "flex items-center gap-2 rounded-pill px-4 py-2 text-[14px] font-semibold transition-all shrink-0",
              activeTab === id
                ? "bg-flouna-maroon text-white shadow-sm"
                : "bg-flouna-pure-white text-flouna-charcoal border border-flouna-grey-soft hover:bg-flouna-ivory"
            )}
          >
            <Icon size={16} className={activeTab === id ? "text-flouna-orange" : "text-flouna-grey-mid"} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StaggerItem className="lg:col-span-2 space-y-6">
            <InsightCard
              title="FLOUNA CORE SIGNAL"
              insight="Your strongest leverage right now is bridging Systems Engineering with Product Management."
              explanation="Based on your top-quartile technical score (84%) and active interest in roadmapping and stakeholder alignment."
            />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-[22px] font-bold text-flouna-maroon">
                  Top Recommended Paths
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("paths")}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-flouna-orange hover:text-flouna-maroon"
                >
                  <span>View all 4 paths</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CAREER_PATHS.slice(0, 2).map((path) => (
                  <PathCard key={path.id} path={path} featured={path.id === "path-pm"} />
                ))}
              </div>
            </div>

            <SkillProfileCard
              skills={SKILL_PROFILES}
              onAddLeverToPlan={() => handleSendMessage("Add Product Analytics to my 30-day plan")}
            />
          </StaggerItem>

          <StaggerItem className="space-y-6">
            <JourneyCard progress={DEFAULT_JOURNEY_PROGRESS} />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-[20px] font-bold text-flouna-maroon">
                  Top Mentor Match
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("mentors")}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-flouna-orange hover:text-flouna-maroon"
                >
                  <span>View network</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <MentorMatchCard mentor={MENTORS[0]} />
            </div>
          </StaggerItem>
        </Stagger>
      )}

      {activeTab === "paths" && (
        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-flouna-maroon">
              Evaluated Career Directions
            </h2>
            <p className="text-[14px] text-flouna-charcoal/80">
              Ranked by alignment with your strengths, interests, and verified industry transition benchmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CAREER_PATHS.map((path) => (
              <PathCard key={path.id} path={path} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "skills" && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-flouna-maroon">
              Skill Telemetry & Levers
            </h2>
            <p className="text-[14px] text-flouna-charcoal/80">
              Quantitative breakdown of your capabilities and the single highest-impact unlock for your next move.
            </p>
          </div>

          <SkillProfileCard
            skills={SKILL_PROFILES}
            onAddLeverToPlan={(lever) => handleSendMessage(`Add ${lever} to my 30-day plan`)}
          />
        </div>
      )}

      {activeTab === "mentors" && (
        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-flouna-maroon">
              AI-Matched Mentor Network
            </h2>
            <p className="text-[14px] text-flouna-charcoal/80">
              Senior practitioners from top technology teams matched to your current challenges and target transitions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MENTORS.map((m) => (
              <MentorMatchCard key={m.id} mentor={m} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "plan" && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-flouna-maroon">
              Your 30-Day Starting Plan
            </h2>
            <p className="text-[14px] text-flouna-charcoal/80">
              Step-by-step milestones to build tangible evidence, close skill gaps, and validate your career direction.
            </p>
          </div>

          <PlanTimelineCard plan={DEFAULT_LEARNING_PLAN} />
        </div>
      )}

      {activeTab === "journey" && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="font-serif text-[26px] font-bold text-flouna-maroon">
              Journey Dashboard & Momentum
            </h2>
            <p className="text-[14px] text-flouna-charcoal/80">
              Track consistency, review milestone progress, and stay focused on your next best move.
            </p>
          </div>

          <JourneyCard progress={DEFAULT_JOURNEY_PROGRESS} />
        </div>
      )}
    </div>
  );
}
