"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles, Send, Minimize2, Maximize2, Trash2, ArrowRight } from "lucide-react";
import { AIAvatar } from "./AIAvatar";
import { AIThinkingState } from "./AIThinkingState";
import { PathCard } from "./cards/PathCard";
import { SkillProfileCard } from "./cards/SkillProfileCard";
import { MentorMatchCard } from "./cards/MentorMatchCard";
import { PlanTimelineCard } from "./cards/PlanTimelineCard";
import { InsightCard } from "./cards/InsightCard";
import { processUserMessage } from "@/lib/ai/orchestrator";
import type { AIResponse } from "@/lib/ai/types";
import { cn } from "@/lib/cn";

export function GlobalAIPanel() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<AIResponse[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  // Context-aware page insight
  const getPageContext = () => {
    if (pathname.includes("/path")) {
      return {
        label: "Viewing Career Paths",
        prompt: "Compare my fit for Product Management vs Product Design",
        hint: "Ask FLOUNA to evaluate your skill alignment for these paths.",
      };
    }
    if (pathname.includes("/mentors")) {
      return {
        label: "Exploring Mentor Network",
        prompt: "Find mentors who can guide my PM transition",
        hint: "Ask FLOUNA to match you with mentors specializing in your active goals.",
      };
    }
    if (pathname.includes("/journey")) {
      return {
        label: "Active Journey & Plan",
        prompt: "What is my next best move today?",
        hint: "Ask FLOUNA for immediate high-leverage tasks or milestone advice.",
      };
    }
    if (pathname.includes("/profile")) {
      return {
        label: "Account & Skill Profile",
        prompt: "Analyze my current skill profile",
        hint: "Ask FLOUNA how your recent activity updates your readiness scores.",
      };
    }
    return {
      label: "Intelligent Career OS",
      prompt: "Help me choose a career path",
      hint: "Ask FLOUNA anything about your direction, skills, mentors, or plans.",
    };
  };

  const contextInfo = getPageContext();

  const handleSend = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg = text.trim();
    setInput("");

    // Optimistic user response record
    const tempUserMsg: AIResponse = {
      id: `u-${Date.now()}`,
      message: userMsg,
      intent: "general_guidance",
      thinkingSteps: [],
      suggestedActions: [],
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setThinking(true);

    try {
      const response = await processUserMessage(userMsg, {
        currentPage: pathname,
      });
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          message: "Something interrupted FLOUNA AI. Let's try that again.",
          intent: "general_guidance",
          thinkingSteps: [],
          suggestedActions: [
            { label: "Retry", prompt: userMsg },
          ],
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open FLOUNA AI Intelligence Panel"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-pill bg-flouna-maroon text-white px-5 py-3.5 shadow-lift transition-all duration-300 hover:bg-flouna-maroon-dark hover:scale-105 group border border-flouna-orange/30"
        >
          <AIAvatar size={24} active className="bg-transparent border-none text-white" />
          <span className="font-serif text-[16px] font-bold tracking-wide">
            Ask FLOUNA
          </span>
          <span className="flex size-2 rounded-full bg-flouna-orange animate-pulse" />
        </button>
      )}

      {/* Slide-out Intelligent Drawer */}
      {isOpen && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex flex-col bg-flouna-pure-white border-l border-flouna-grey-soft shadow-2xl transition-all duration-300 ease-in-out",
            isExpanded
              ? "w-full md:w-[680px]"
              : "w-full sm:w-[460px]"
          )}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-flouna-grey-soft bg-flouna-warm-white">
            <div className="flex items-center gap-2.5">
              <AIAvatar size={32} active />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-[18px] font-bold text-flouna-maroon">
                    FLOUNA AI
                  </h3>
                  <span className="rounded-full bg-flouna-orange-soft px-2 py-0.5 text-[10px] font-bold uppercase text-flouna-maroon">
                    Live Intelligence
                  </span>
                </div>
                <p className="text-[11px] text-flouna-charcoal/70">
                  {contextInfo.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([])}
                title="Clear conversation"
                className="p-1.5 text-flouna-grey-mid hover:text-flouna-maroon rounded-full hover:bg-flouna-ivory transition-colors"
              >
                <Trash2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse panel" : "Expand panel"}
                className="hidden sm:inline-flex p-1.5 text-flouna-grey-mid hover:text-flouna-maroon rounded-full hover:bg-flouna-ivory transition-colors"
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close panel"
                className="p-1.5 text-flouna-grey-mid hover:text-flouna-maroon rounded-full hover:bg-flouna-ivory transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 space-y-5 bg-flouna-warm-white/40"
          >
            {/* Context Prompt Card if empty */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-flouna-grey-soft bg-flouna-pure-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-flouna-maroon">
                    <Sparkles size={16} className="text-flouna-orange" />
                    <span className="text-[12px] font-bold uppercase tracking-wider">
                      Page Context Detected
                    </span>
                  </div>
                  <p className="font-serif text-[17px] font-bold text-flouna-charcoal">
                    {contextInfo.hint}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSend(contextInfo.prompt)}
                    className="inline-flex items-center gap-2 rounded-pill bg-flouna-ivory border border-flouna-maroon/20 px-4 py-2 text-[13px] font-semibold text-flouna-maroon hover:bg-flouna-orange-soft transition-colors"
                  >
                    <span>&ldquo;{contextInfo.prompt}&rdquo;</span>
                    <ArrowRight size={14} className="text-flouna-orange" />
                  </button>
                </div>

                <InsightCard
                  title="FLOUNA SIGNALS"
                  insight="Your active focus is PRD Crafting. Connecting with Maya Sharma will accelerate your portfolio review."
                  explanation="Based on your 72% plan completion rate and 14-day consistency streak."
                />
              </div>
            )}

            {/* Render conversation items */}
            {messages.map((msg, index) => {
              const isUser = msg.id.startsWith("u-");

              return (
                <div
                  key={msg.id || index}
                  className={cn("flex flex-col space-y-3", isUser ? "items-end" : "items-start")}
                >
                  {isUser ? (
                    <div className="max-w-[85%] rounded-[18px] rounded-br-xs bg-flouna-maroon px-4 py-2.5 text-[14px] text-white shadow-sm font-medium">
                      {msg.message}
                    </div>
                  ) : (
                    <div className="w-full space-y-4">
                      {/* Assistant Text Bubble */}
                      <div className="rounded-[18px] rounded-tl-xs border border-flouna-grey-soft bg-flouna-pure-white p-4 text-[14px] text-flouna-charcoal shadow-sm leading-relaxed">
                        {msg.message}
                      </div>

                      {/* Render Structured Cards if attached */}
                      {msg.paths && msg.paths.length > 0 && (
                        <div className="space-y-3">
                          {msg.paths.slice(0, 2).map((p) => (
                            <PathCard key={p.id} path={p} />
                          ))}
                        </div>
                      )}

                      {msg.skills && msg.skills.length > 0 && (
                        <SkillProfileCard skills={msg.skills} />
                      )}

                      {msg.mentors && msg.mentors.length > 0 && (
                        <div className="space-y-3">
                          {msg.mentors.slice(0, 2).map((m) => (
                            <MentorMatchCard key={m.id} mentor={m} />
                          ))}
                        </div>
                      )}

                      {msg.plan && (
                        <PlanTimelineCard plan={msg.plan} />
                      )}

                      {/* Suggested Next Actions */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => handleSend(action.prompt)}
                              className="rounded-pill bg-flouna-ivory border border-flouna-grey-soft px-3 py-1 text-[12px] font-medium text-flouna-charcoal hover:border-flouna-orange hover:bg-flouna-orange-soft hover:text-flouna-maroon transition-all"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking Indicator */}
            {thinking && (
              <div className="w-full">
                <AIThinkingState />
              </div>
            )}
          </div>

          {/* Panel Composer Footer */}
          <div className="p-4 border-t border-flouna-grey-soft bg-flouna-pure-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="flex items-center gap-2 rounded-pill border border-flouna-grey-soft bg-flouna-warm-white px-4 py-2 shadow-sm focus-within:border-flouna-maroon/40 focus-within:ring-2 focus-within:ring-flouna-maroon/10"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask FLOUNA anything..."
                disabled={thinking}
                className="flex-1 bg-transparent text-[14px] text-flouna-charcoal placeholder:text-flouna-grey-mid outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="flex size-8 items-center justify-center rounded-full bg-flouna-maroon text-white transition-all hover:bg-flouna-maroon-dark disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
