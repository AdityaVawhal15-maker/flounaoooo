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
  Search as SearchIcon,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import {
  ComboRecommendation,
  FoodRecommendation,
  RideRecommendation,
  ShopRecommendation,
} from "@/components/chat/RecommendationCards";
import { VoiceButton } from "@/components/chat/VoiceButton";
import { ThinkingSteps } from "@/components/chat/ThinkingSteps";
import { PredictionBanner } from "@/components/chat/PredictionBanner";
import { useI18n } from "@/components/i18n/I18nContext";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { type TILE_THEMES } from "@/components/ui/CategoryTile";
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

// Does this ask actually involve comparing options? Greetings, thanks and
// small talk don't — claiming to "compare across providers" for "hello" is
// theatre. Deliberately broad: anything that isn't obviously small talk gets
// the full trace, so a real request never under-reports the work.
const SMALL_TALK =
  /^(hi|hey|hello|yo|hola|namaste|thanks|thank you|thx|ok|okay|cool|nice|good (morning|afternoon|evening|night)|bye|who are you|what can you do|help)\b[\s!.?]*$/i;

function needsComparison(message: string): boolean {
  return message.trim() !== "" && !SMALL_TALK.test(message.trim());
}

export default function ChatHomePage() {
  return (
    <Suspense fallback={null}>
      <ChatHome />
    </Suspense>
  );
}

function ChatHome() {
  const { t } = useI18n();
  const router = useRouter();
  const chatParam = useSearchParams().get("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  // The message currently being answered — decides whether the thinking trace
  // shows the full comparison steps or a plain "Thinking…".
  const [lastAsk, setLastAsk] = useState("");
  // Temporary chat: nothing is persisted server-side and the thread lives only
  // in this component's state.
  const [temporary, setTemporary] = useState(false);
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
    setLastAsk(message);
    setThinking(true);
    try {
      const d = await api<{ sessionId: string | null; message: ChatMessage }>(
        "/api/chat/message",
        {
          method: "POST",
          json: temporary
            ? { message, temporary: true }
            : { message, sessionId },
        },
      );
      setMessages((m) => [...m, d.message]);
      // A temporary chat has no server session and must never touch the URL —
      // a ?chat= param would make it restorable, which is the whole point of
      // temporary.
      if (!temporary && d.sessionId) {
        setSessionId(d.sessionId);
        if (!sessionId) {
          // Keep the URL in sync so the sidebar highlights this chat and
          // refresh/share restores the conversation.
          setPrevChat(d.sessionId);
          router.replace(`/home?chat=${d.sessionId}`, { scroll: false });
        }
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
    <div
      className={cn(
        // 4rem = the mobile app header; desktop has none.
        "mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-4 lg:h-dvh lg:px-6",
        empty ? "lg:max-w-3xl" : "lg:max-w-5xl",
      )}
    >
      {/* Temporary chat toggle — the incognito switch. On = nothing about this
          conversation is stored.

          These used to be pinned into the mobile app header, but the redesign
          fills that bar with hamburger / wordmark / avatar, so they sit in the
          chat column on every width now rather than overlapping the avatar. */}
      <div className="flex w-full items-center justify-end gap-2 pt-2 lg:pt-3">
        <button
          onClick={() => {
            setTemporary((v) => {
              const next = !v;
              // Switching modes starts a clean thread either way.
              setMessages([]);
              setSessionId(undefined);
              if (next) router.replace("/home", { scroll: false });
              return next;
            });
          }}
          aria-pressed={temporary}
          title={
            temporary
              ? "Temporary chat is on — this conversation isn't being saved"
              : "Start a temporary chat that isn't saved"
          }
          className={cn(
            "flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors",
            temporary
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-card text-cocoa hover:bg-beige/50",
          )}
        >
          {temporary ? <EyeOff size={14} /> : <Eye size={14} />}
          {temporary ? "Temporary chat on" : "Temporary chat"}
        </button>
      </div>

      {temporary && empty && (
        <p className="mx-auto mt-2 max-w-md text-center text-[12px] leading-relaxed text-cocoa lg:mt-1">
          This chat won&apos;t appear in your history and won&apos;t be used to
          personalise your recommendations. Flouna never trains AI models on
          your conversations.
        </p>
      )}

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          {/* Proactive heads-up — the engine getting ahead of the user (rain
              near their usual ride, etc.). Renders nothing when quiet. */}
          <div className="mb-6 w-full max-w-md">
            <PredictionBanner
              onBook={(drop) => setInput(`Book a ride to ${drop}`)}
            />
          </div>

          {/* Hero heading — two lines, two colours (Figma 2177:4763: navy then
              terracotta). */}
          <FadeIn y={10}>
            <h1 className="text-balance text-[30px] font-bold leading-[1.2] tracking-tight lg:text-[44px]">
              <span className="text-navy">{t("chat.heading1")}</span>
              <span className="text-terracotta">{t("chat.heading2")}</span>
            </h1>
          </FadeIn>

          {/* Quick chips — flat, as drawn (Figma 2177:4763). Two per row on
              mobile. */}
          <Stagger delayChildren={0.15} className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {suggestions.slice(0, 3).map((s) => {
              const Icon = ICONS[s.icon] ?? Pizza;
              return (
                <StaggerItem key={s.label}>
                  <button
                    onClick={() =>
                      s.prompt.endsWith(" ") ? setInput(s.prompt) : send(s.prompt)
                    }
                    className="flex items-center gap-2 rounded-pill bg-chip px-5 py-3 text-[15px] font-medium text-chip-ink transition-colors hover:opacity-90"
                  >
                    <Icon size={16} className="text-chip-ink" />
                    {s.label}
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>

          {usual && (
            <FadeIn delay={0.35} className="mt-5 w-full max-w-md">
              <Link
                href={`/food/order/${usual.dishId}?platform=${usual.platform}`}
                // Outlined rather than solid: the accent chips above are the
                // primary suggestions, and a second solid pill would compete
                // with them instead of reading as the quieter shortcut it is.
                className="flex items-center gap-2.5 rounded-pill border border-line bg-card px-4 py-3 text-left shadow-soft transition-colors hover:bg-beige/40"
              >
                <RotateCcw size={16} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                  {t("chat.yourUsual")} {usual.name}
                </span>
                <span className="shrink-0 text-[14px] font-bold text-accent">
                  {rupees(usual.effectivePaise)}
                </span>
              </Link>
            </FadeIn>
          )}
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
          {thinking && <ThinkingSteps simple={!needsComparison(lastAsk)} />}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 z-10 pb-4 pt-2"
      >
        {/* Ask bar — the redesign lifts the send button out of the field into
            its own accent circle beside it (Figma 2177:4763). */}
        <div className="flex items-center gap-3">
          {/* bg-card, not a hardcoded white: the text inside is text-ink, which
              flips to near-white in dark mode. Against a fixed white pill that
              left what you typed at 1.13:1 contrast — invisible. */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-pill bg-card py-3 pl-5 pr-4 shadow-card">
            <SearchIcon size={19} className="shrink-0 text-ink/70" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              maxLength={500}
              className="h-9 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-[#a09890]"
            />
            <VoiceButton onTranscript={setInput} onFinal={send} />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex size-[54px] shrink-0 items-center justify-center rounded-full bg-send text-white transition-colors hover:opacity-90 disabled:opacity-40"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
