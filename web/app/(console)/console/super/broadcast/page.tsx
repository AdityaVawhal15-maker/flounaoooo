"use client";

import { useState } from "react";
import { Megaphone, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { PageTitle } from "@/components/console/ConsoleShell";
import { ConsolePage, Card } from "@/components/console/ui";

type Result = { configured: boolean; sent: number; failed: number; devices: number };

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api<Result>("/api/console/super/broadcast", {
        method: "POST",
        json: { title, body, ...(url.trim() ? { url: url.trim() } : {}) },
      });
      setResult(res);
      if (res.configured) {
        setTitle("");
        setBody("");
        setUrl("");
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Broadcast failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConsolePage accept={["super_admin"]}>
      <PageTitle
        title="Broadcast"
        subtitle="Send a push notification to every subscribed device. Use sparingly, every send is audited."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Compose announcement">
          <form onSubmit={send} className="space-y-4 p-5">
            <label className="block">
              <span className="c-label text-[10.5px]" style={{ color: "var(--c-muted)" }}>
                Title
              </span>
              <input
                required
                minLength={3}
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New: live order tracking"
                className="c-input mt-1.5 w-full rounded-lg px-3 py-2.5 text-[14px] outline-none"
              />
            </label>
            <label className="block">
              <span className="c-label text-[10.5px]" style={{ color: "var(--c-muted)" }}>
                Message
              </span>
              <textarea
                required
                minLength={3}
                maxLength={300}
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Short, useful, worth interrupting someone for."
                className="c-input mt-1.5 w-full resize-none rounded-lg px-3 py-2.5 text-[14px] outline-none"
              />
            </label>
            <label className="block">
              <span className="c-label text-[10.5px]" style={{ color: "var(--c-muted)" }}>
                Open on tap (optional path)
              </span>
              <input
                maxLength={200}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/home"
                className="c-input c-mono mt-1.5 w-full rounded-lg px-3 py-2.5 text-[13px] outline-none"
              />
            </label>

            {error && (
              <p
                className="rounded-lg px-3 py-2 text-[13px]"
                style={{ background: "#f6e7e5", color: "var(--c-red)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || title.trim().length < 3 || body.trim().length < 3}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--c-maroon)" }}
            >
              <Send size={15} /> Send to all devices
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          {/* Live preview of what users will see */}
          <Card title="Preview">
            <div className="p-5">
              <div
                className="flex items-start gap-3 rounded-xl bg-white p-4"
                style={{ border: "1px solid var(--c-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: "var(--c-crimson)" }}
                >
                  <Megaphone size={16} style={{ color: "var(--c-amber)" }} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold" style={{ color: "var(--c-ink)" }}>
                    {title.trim() || "Notification title"}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: "var(--c-muted)" }}>
                    {body.trim() || "Your message appears here exactly as users will read it."}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {result && (
            <Card>
              <div className="flex items-start gap-3 p-5">
                {result.configured ? (
                  <>
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: "#1a7a4a" }} />
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "var(--c-ink)" }}>
                        Delivered to {result.sent} of {result.devices} device
                        {result.devices === 1 ? "" : "s"}
                      </p>
                      {result.failed > 0 && (
                        <p className="mt-0.5 text-[12px]" style={{ color: "var(--c-muted)" }}>
                          {result.failed} failed (expired subscriptions are pruned automatically).
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: "var(--c-gold)" }} />
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "var(--c-ink)" }}>
                        Push isn&apos;t configured yet
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: "var(--c-muted)" }}>
                        Nothing was sent. Set VAPID keys in the server env (npx web-push
                        generate-vapid-keys) and users must enable notifications in Settings.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </ConsolePage>
  );
}
