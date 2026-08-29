"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

// A Help Centre article.
//
// The article and the chat assistant read the same knowledge base entry, so
// "Still need help" opens a conversation already on this topic — the customer
// never repeats what they just read.

type Topic = {
  slug: string;
  title: string;
  summary: string;
  article: string[];
};

export default function HelpTopicPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [topic, setTopic] = useState<Topic | null | "missing">(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ topic: Topic }>(`/api/support/topics/${params.slug}`)
      .then((d) => {
        if (!cancelled) setTopic(d.topic);
      })
      .catch(() => {
        if (!cancelled) setTopic("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  async function startChat() {
    setStarting(true);
    try {
      const d = await api<{ chat: { id: string } }>("/api/support/chats", {
        method: "POST",
        json: { topic: params.slug },
      });
      router.push(`/profile/help/chat/${d.chat.id}`);
    } catch {
      toast("Could not start a chat just now");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center py-4">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="tap-target flex size-9 shrink-0 items-center justify-center rounded-full bg-card shadow-soft transition-colors hover:bg-acct-bg"
          >
            <ArrowLeft size={18} className="text-acct-ink" />
          </button>
          <h1 className="flex-1 pr-9 text-center text-[17px] font-extrabold text-acct-ink">
            Help Center
          </h1>
        </div>

        {topic === null ? (
          <p className="px-1 py-8 text-center text-[13px] text-acct-muted">Loading…</p>
        ) : topic === "missing" ? (
          <p className="px-1 py-8 text-center text-[13px] text-acct-muted">
            That help topic no longer exists.
          </p>
        ) : (
          <>
            <div className="rounded-[18px] bg-card p-5 shadow-soft">
              <h2 className="text-[19px] font-extrabold text-acct-ink">{topic.title}</h2>
              <p className="mt-1 text-[13px] text-acct-muted">{topic.summary}</p>
              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                {topic.article.map((para) => (
                  <p key={para} className="text-[14px] leading-relaxed text-igm-body">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[18px] bg-card p-5 text-center shadow-soft">
              <p className="text-[15px] font-bold text-acct-ink">
                Did this answer it?
              </p>
              <p className="mt-1 text-[13px] text-acct-muted">
                If not, start a chat and we&apos;ll pick up from here.
              </p>
              <button
                onClick={startChat}
                disabled={starting}
                className="mt-4 inline-flex h-[48px] items-center gap-2 rounded-pill bg-acct-accent px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <MessageSquare size={16} />
                {starting ? "Starting…" : "Chat about this"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
