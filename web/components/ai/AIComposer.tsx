"use client";

import React, { useState, useRef } from "react";
import { ArrowUp, Mic, MicOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

type SuggestedChip = {
  label: string;
  prompt: string;
};

type AIComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  suggestions?: SuggestedChip[];
  placeholder?: string;
  className?: string;
};

const DEFAULT_SUGGESTIONS: SuggestedChip[] = [
  { label: "Help me choose a career path", prompt: "Help me choose a career path based on my background" },
  { label: "Find mentors for me", prompt: "Find senior mentors who can guide my transition" },
  { label: "Analyze my skills", prompt: "Analyze my current skill profile and find my next lever" },
  { label: "Build my 30-day plan", prompt: "Build my 30-day starting plan for product management" },
  { label: "What's my next best step?", prompt: "What is my next best step today?" },
];

export function AIComposer({
  onSend,
  disabled = false,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Ask FLOUNA anything about your career path, skills, or mentors...",
  className,
}: AIComposerProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleChipClick = (prompt: string) => {
    if (disabled) return;
    onSend(prompt);
  };

  const toggleRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      // @ts-expect-error - webkitSpeechRecognition is standard browser API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: { results: { transcript: string }[][] }) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Suggested Prompt Chips */}
      {suggestions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid shrink-0 flex items-center gap-1">
            <Sparkles size={12} className="text-flouna-orange" />
            Suggested:
          </span>
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => handleChipClick(s.prompt)}
              disabled={disabled}
              className="rounded-pill bg-flouna-pure-white border border-flouna-grey-soft/80 px-3.5 py-1.5 text-[12px] font-medium text-flouna-charcoal transition-all hover:border-flouna-orange hover:bg-flouna-orange-soft/40 hover:text-flouna-maroon shrink-0 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Field */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 rounded-pill bg-flouna-pure-white border border-flouna-grey-soft px-4 py-2 shadow-sm transition-all focus-within:border-flouna-maroon/40 focus-within:ring-2 focus-within:ring-flouna-maroon/10 focus-within:shadow-md"
      >
        <Sparkles size={18} className="text-flouna-orange shrink-0 ml-1" />

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-[15px] text-flouna-charcoal placeholder:text-flouna-grey-mid outline-none disabled:opacity-60"
        />

        <button
          type="button"
          onClick={toggleRecording}
          aria-label={isRecording ? "Stop voice input" : "Voice input"}
          className={cn(
            "flex size-9 items-center justify-center rounded-full text-flouna-grey-mid hover:text-flouna-maroon hover:bg-flouna-ivory transition-colors",
            isRecording && "bg-flouna-orange-soft text-flouna-orange animate-pulse"
          )}
        >
          {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
        </button>

        <button
          type="submit"
          disabled={!input.trim() || disabled}
          aria-label="Send message"
          className="flex size-9 items-center justify-center rounded-full bg-flouna-maroon text-white transition-all hover:bg-flouna-maroon-dark hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 disabled:bg-flouna-grey-mid"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
