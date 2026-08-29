"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { Send, Lock, ShieldAlert, Info } from "lucide-react";
import { api } from "@/lib/api";
import { GroupHeader } from "@/components/food/GroupHeader";
import type { GroupCart } from "@/components/food/GroupCartTypes";
import { useI18n } from "@/components/i18n/I18nContext";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  cryptoAvailable,
  deviceId,
  publicKeyB64,
  newGroupKey,
  cacheGroupKey,
  cachedGroupKey,
  sealFor,
  openEnvelope,
  encryptMessage,
  decryptMessage,
  type MemberDevice,
} from "@/lib/groupCrypto";

// Group chat, encrypted end to end.
//
// The screen's whole job on load is to get hold of the group key: register this
// browser's public key, look for an envelope addressed to it, and — if this is
// the first device in the room — make the key and seal it for everyone else.
// Only then is there anything to read.
//
// A message that cannot be decrypted is shown as locked rather than hidden.
// Hiding it would misrepresent the conversation; a member who joined late
// genuinely cannot read what was said before they arrived, and saying so is
// more honest than pretending it never happened.

const POLL_MS = 3000;

type Wire = {
  id: string;
  senderId: string;
  senderName: string;
  isYou: boolean;
  iv: string;
  ciphertext: string;
  createdAt: string;
};

type Shown = Wire & { text: string | null };

export default function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useI18n();
  const { toast } = useToast();
  const [cart, setCart] = useState<GroupCart | null>(null);
  const [messages, setMessages] = useState<Shown[]>([]);
  const [draft, setDraft] = useState("");
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [state, setState] = useState<"setup" | "ready" | "unsupported" | "failed">("setup");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);
  const lastAt = useRef<string | null>(null);

  useEffect(() => {
    api<GroupCart>(`/api/groups/${id}`).then(setCart).catch(() => {});
  }, [id]);

  // ---- get into the room ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!cryptoAvailable()) {
        setState("unsupported");
        return;
      }
      try {
        const myDevice = deviceId();
        await api(`/api/groups/${id}/chat/devices`, {
          method: "POST",
          json: { deviceId: myDevice, publicKey: await publicKeyB64() },
        });

        const keys = await api<{
          devices: MemberDevice[];
          envelopes: { deviceId: string; senderKey: string; iv: string; wrappedKey: string }[];
          pending: MemberDevice[];
        }>(`/api/groups/${id}/chat/keys`);

        // Already have it from a previous visit on this device?
        let groupKey = await cachedGroupKey(id);

        // Otherwise, open the envelope addressed to us.
        if (!groupKey) {
          for (const env of keys.envelopes) {
            if (env.deviceId !== myDevice) continue;
            const opened = await openEnvelope(env);
            if (opened) {
              groupKey = opened;
              break;
            }
          }
        }

        // Still nothing, and nobody has been let in yet: this is the first
        // device in the room, so it makes the key.
        const nobodyIn = keys.pending.length === keys.devices.length;
        if (!groupKey && nobodyIn) groupKey = await newGroupKey();

        if (!groupKey) {
          // Someone holds the key but has not sealed for us yet. They do it on
          // their next poll; until then there is genuinely nothing to read.
          if (!cancelled) setState("setup");
          return;
        }

        await cacheGroupKey(id, groupKey);
        if (!cancelled) {
          setKey(groupKey);
          setState("ready");
        }

        // Let in anyone still waiting, THIS DEVICE INCLUDED.
        //
        // Sealing for yourself is not redundant. An envelope is the only record
        // the server has that anybody holds the key, and "nobody holds it yet"
        // is what tells the next device to mint one. Skipping self left that
        // record empty, so the second device to arrive believed it was the
        // first, minted its own key, and the two of them talked past each other
        // in ciphertext neither could read.
        const waiting = keys.pending;
        if (waiting.length > 0) {
          const envelopes = [];
          for (const d of waiting) {
            envelopes.push({ userId: d.userId, deviceId: d.deviceId, ...(await sealFor(groupKey, d)) });
          }
          await api(`/api/groups/${id}/chat/keys`, {
            method: "POST",
            json: { envelopes },
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when the membership changes, so new devices get sealed for.
  }, [id, cart?.members.length]);

  // ---- read ----
  const poll = useCallback(async () => {
    if (!key) return;
    try {
      const since = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
      const d = await api<{ messages: Wire[] }>(`/api/groups/${id}/chat/messages${since}`);
      if (d.messages.length === 0) return;
      lastAt.current = d.messages[d.messages.length - 1]!.createdAt;
      const decrypted: Shown[] = [];
      for (const m of d.messages) {
        decrypted.push({ ...m, text: await decryptMessage(key, m.iv, m.ciphertext) });
      }
      setMessages((prev) => [...prev, ...decrypted]);
    } catch {
      /* a dropped poll is not worth a banner */
    }
  }, [id, key]);

  useEffect(() => {
    if (!key) return;
    // Kicked off asynchronously so the first read never lands as a synchronous
    // setState inside the effect body.
    const first = setTimeout(() => void poll(), 0);
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [key, poll]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || !key) return;
    setSending(true);
    try {
      const { iv, ciphertext } = await encryptMessage(key, text);
      await api(`/api/groups/${id}/chat/messages`, {
        method: "POST",
        json: { iv, ciphertext },
      });
      setDraft("");
      await poll();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("chat.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-xl flex-col px-4 lg:max-w-2xl lg:px-6">
      <GroupHeader
        title={cart?.name ?? t("chat.groupChat")}
        subtitle={t("chat.membersCount").replace("{n}", String(cart?.members.length ?? 0))}
        backTo={`/food/group/${id}`}
        right={
          <span className="flex size-9 items-center justify-center rounded-full bg-success/10">
            <Lock size={16} className="text-success" />
          </span>
        }
      />

      {/* The claim, and its limit, in the place people will read it. */}
      <div className="mb-3 flex items-start gap-2 rounded-[14px] bg-success/8 px-3 py-2.5">
        <Lock size={13} className="mt-0.5 shrink-0 text-success" />
        <p className="text-[11px] leading-relaxed text-success">{t("chat.e2eeNotice")}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state === "unsupported" && (
          <Notice icon={<ShieldAlert size={15} />} tone="warning">
            {t("chat.unsupported")}
          </Notice>
        )}
        {state === "failed" && (
          <Notice icon={<ShieldAlert size={15} />} tone="danger">
            {t("chat.setupFailed")}
          </Notice>
        )}
        {state === "setup" && (
          <Notice icon={<Info size={15} />} tone="muted">
            {t("chat.waitingForKey")}
          </Notice>
        )}

        {state === "ready" && messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-cocoa">{t("chat.noMessages")}</p>
        )}

        <div className="flex flex-col gap-2.5 pb-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex flex-col", m.isYou ? "items-end" : "items-start")}
            >
              {!m.isYou && (
                <span className="mb-0.5 px-1 text-[11px] font-semibold text-cocoa">
                  {m.senderName}
                </span>
              )}
              <span
                className={cn(
                  "max-w-[80%] rounded-[16px] px-3.5 py-2 text-[14px] leading-relaxed",
                  m.isYou
                    ? "rounded-br-[6px] bg-accent text-white"
                    : "rounded-bl-[6px] bg-card text-ink shadow-soft",
                  m.text === null && "italic opacity-70",
                )}
              >
                {m.text === null ? (
                  <span className="flex items-center gap-1.5">
                    <Lock size={12} /> {t("chat.cannotRead")}
                  </span>
                ) : (
                  m.text
                )}
              </span>
              <span className="mt-0.5 px-1 text-[10px] text-cocoa/70">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          <div ref={bottom} />
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 bg-cream py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={state !== "ready"}
          placeholder={
            state === "ready" ? t("chat.typeMessage") : t("chat.notReady")
          }
          className="h-[46px] min-w-0 flex-1 rounded-pill border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={state !== "ready" || sending || draft.trim().length === 0}
          aria-label={t("common.send")}
          className="tap-target flex size-[46px] shrink-0 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-45"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function Notice({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode;
  tone: "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[12px] leading-relaxed",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "muted" && "bg-card text-cocoa shadow-soft",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}
