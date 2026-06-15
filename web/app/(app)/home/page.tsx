"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Pizza, Send, RotateCcw, ShoppingBag } from "lucide-react";
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
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import type { ChatMessage, FoodQuote } from "@/components/chat/types";
import { cn } from "@/lib/cn";

type Usual = FoodQuote & { timesOrdered: number };

const SUGGESTIONS: {
  key: TranslationKey;
  icon: typeof MapPin;
  prompt: string;
}[] = [
  { key: "chat.bookRide", icon: MapPin, prompt: "Book a ride to " },
  { key: "chat.orderPizza", icon: Pizza, prompt: "Order a pizza under ₹300" },
  { key: "chat.shopNow", icon: ShoppingBag, prompt: "Find me a gaming laptop under ₹70000" },
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ usual: Usual | null }>("/api/users/usual")
      .then((d) => setUsual(d.usual))
      .catch(() => setUsual(null));
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
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-[26px] font-bold leading-snug lg:text-[34px]">
            <span className="text-ink">{t("chat.heading1")}</span>
            <span className="block text-accent">{t("chat.heading2")}</span>
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {SUGGESTIONS.map(({ key, icon: Icon, prompt }) => (
              <button
                key={key}
                onClick={() =>
                  prompt.endsWith(" ") ? setInput(prompt) : send(prompt)
                }
                className="flex items-center gap-1.5 rounded-pill bg-beige px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-[#e6d8cc]"
              >
                <Icon size={14} className="text-cocoa" />
                {t(key)}
              </button>
            ))}
          </div>

          {usual && (
            <Link
              href={`/food/order/${usual.dishId}?platform=${usual.platform}`}
              className="mt-4 flex items-center gap-2 rounded-pill border border-accent/50 bg-accent-soft px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-[#ffdfc9]"
            >
              <RotateCcw size={14} className="text-accent" />
              {t("chat.yourUsual")} {usual.name} · {rupees(usual.effectivePaise)}
              <span className="text-[11px] font-normal text-cocoa">
                ordered {usual.timesOrdered}×
              </span>
            </Link>
          )}
          <p className="mt-8 text-[12px] text-cocoa/70">
            Hi {user?.name?.split(" ")[0]} — I compare prices, offers and delivery
            times across platforms, then pick the best one.
          </p>
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
