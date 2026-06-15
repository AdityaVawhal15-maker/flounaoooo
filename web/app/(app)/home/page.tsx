"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Pizza,
  Send,
  RotateCcw,
  ShoppingBag,
  Car,
  Utensils,
  Coffee,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { useAuth } from "@/components/auth/AuthContext";
import {
  ComboRecommendation,
  FoodRecommendation,
  RideRecommendation,
  ShopRecommendation,
} from "@/components/chat/RecommendationCards";
import { VoiceButton } from "@/components/chat/VoiceButton";
import { useI18n } from "@/components/i18n/I18nContext";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { CategoryTile, type TILE_THEMES } from "@/components/ui/CategoryTile";
import type { ChatMessage, FoodQuote } from "@/components/chat/types";
import { cn } from "@/lib/cn";

type Usual = FoodQuote & { timesOrdered: number };

// Server-built personalized chips. `icon`/`theme` are string keys we map to
// real components/themes here (they can't cross the JSON boundary).
type Suggestion = {
  label: string;
  prompt: string;
  icon: string;
  theme: keyof typeof TILE_THEMES;
};

const ICONS: Record<string, LucideIcon> = {
  pizza: Pizza,
  mapPin: MapPin,
  shoppingBag: ShoppingBag,
  car: Car,
  utensils: Utensils,
  coffee: Coffee,
  moon: Moon,
  rotate: RotateCcw,
};

// Shown instantly while the personalized set loads (and if the request fails).
const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { label: "Order pizza", prompt: "Order a pizza under ₹300", icon: "pizza", theme: "orange" },
  { label: "Book a ride", prompt: "Book a ride to ", icon: "mapPin", theme: "blue" },
  { label: "Shop a laptop", prompt: "Find me a gaming laptop under ₹70000", icon: "shoppingBag", theme: "purple" },
];

export default function ChatHomePage() {
  return (
    <Suspense fallback={null}>
      <ChatHome />
    </Suspense>
  );
}

function ChatHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const chatParam = useSearchParams().get("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const [usual, setUsual] = useState<Usual | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(FALLBACK_SUGGESTIONS);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ usual: Usual | null }>("/api/users/usual")
      .then((d) => setUsual(d.usual))
      .catch(() => setUsual(null));
    api<{ suggestions: Suggestion[] }>("/api/users/suggestions")
      .then((d) => d.suggestions.length > 0 && setSuggestions(d.suggestions))
      .catch(() => {
        /* keep fallbacks */
      });
  }, []);

  // "New Chat" (no ?chat param) resets the thread — reset-during-render.
  const [prevChat, setPrevChat] = useState(chatParam);
  if (prevChat !== chatParam) {
    setPrevChat(chatParam);
    if (!chatParam) {
      setMessages([]);
      setSessionId(undefined);
    }
  }

  // Opening a chat from the sidebar loads its stored messages.
  useEffect(() => {
    if (!chatParam || chatParam === sessionId) return;
    api<{ session: { id: string; messages: ChatMessage[] } }>(
      `/api/chat/sessions/${chatParam}`,
    )
      .then((d) => {
        setSessionId(d.session.id);
        setMessages(d.session.messages);
      })
      .catch(() => router.replace("/home"));
  }, [chatParam, sessionId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || thinking) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    setThinking(true);
    try {
      const d = await api<{ sessionId: string; message: ChatMessage }>(
        "/api/chat/message",
        { method: "POST", json: { message, sessionId } },
      );
      setSessionId(d.sessionId);
      setMessages((m) => [...m, d.message]);
      if (!sessionId) {
        // Keep the URL in sync so the sidebar highlights this chat and
        // refresh/share restores the conversation.
        setPrevChat(d.sessionId);
        router.replace(`/home?chat=${d.sessionId}`, { scroll: false });
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Something went wrong — try again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col px-4 lg:h-dvh lg:px-6">
      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <FadeIn y={10}>
            <p className="text-[13px] font-medium text-muted">
              Hi {user?.name?.split(" ")[0]} 👋
            </p>
          </FadeIn>
          <FadeIn delay={0.08} className="mt-2">
            <h1 className="text-[30px] font-bold leading-[1.12] tracking-tight text-ink lg:text-[40px]">
              {t("chat.heading1")}
              <br className="hidden sm:block" />
              <span className="italic text-accent">{t("chat.heading2")}</span>
            </h1>
          </FadeIn>

          {/* Suggestion tiles — personalized server-side, fixed equal height */}
          <Stagger delayChildren={0.18} className="mt-9 grid w-full max-w-md grid-cols-3 items-stretch gap-3">
            {suggestions.map((s) => {
              const Icon = ICONS[s.icon] ?? Pizza;
              return (
                <StaggerItem key={s.label} className="h-full">
                  <button
                    onClick={() =>
                      s.prompt.endsWith(" ") ? setInput(s.prompt) : send(s.prompt)
                    }
                    className="flex h-full w-full flex-col items-center gap-2 rounded-card border border-line/60 bg-card p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <CategoryTile icon={Icon} theme={s.theme} size={42} />
                    <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink">
                      {s.label}
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>

          {usual && (
            <FadeIn delay={0.4} className="mt-4 w-full max-w-md">
              <Link
                href={`/food/order/${usual.dishId}?platform=${usual.platform}`}
                className="flex items-center gap-2.5 rounded-card border border-accent/40 bg-accent-soft/60 px-4 py-3 text-left transition-colors hover:bg-accent-soft"
              >
                <RotateCcw size={16} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                  {t("chat.yourUsual")} {usual.name}
                </span>
                <span className="shrink-0 text-[13px] font-bold text-accent">
                  {rupees(usual.effectivePaise)}
                </span>
              </Link>
            </FadeIn>
          )}

          <FadeIn delay={0.5}>
            <p className="mt-8 max-w-[300px] text-[12px] leading-relaxed text-muted">
              I compare prices, offers and delivery times across platforms, then
              pick the best one for you.
            </p>
          </FadeIn>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto py-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "user" ? (
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-cocoa px-4 py-2.5 text-[14px] text-white">
                  {m.content}
                </p>
              ) : (
                <div className="w-full max-w-[95%]">
                  <p className="text-[14px] leading-relaxed text-ink">{m.content}</p>
                  {m.recommendation?.type === "food" && (
                    <div className="mt-3">
                      <FoodRecommendation rec={m.recommendation} />
                    </div>
                  )}
                  {m.recommendation?.type === "ride" && (
                    <div className="mt-3">
                      <RideRecommendation rec={m.recommendation} />
                    </div>
                  )}
                  {m.recommendation?.type === "shop" && (
                    <div className="mt-3">
                      <ShopRecommendation rec={m.recommendation} />
                    </div>
                  )}
                  {m.recommendation?.type === "combo" && (
                    <div className="mt-3">
                      <ComboRecommendation rec={m.recommendation} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-1.5 pl-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2 animate-bounce rounded-full bg-cocoa/50"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 z-10 pb-4 pt-2 lg:bottom-0"
      >
        <div className="flex items-center gap-2 rounded-pill border border-line bg-card py-1.5 pl-5 pr-1.5 shadow-card">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chat.placeholder")}
            maxLength={500}
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-cocoa/50"
          />
          <VoiceButton onTranscript={setInput} onFinal={send} />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-[#d4570f] disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
