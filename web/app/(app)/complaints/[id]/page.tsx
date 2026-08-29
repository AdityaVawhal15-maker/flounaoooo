"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  MessageSquare,
  ShieldAlert,
  Copy,
  ChevronRight,
  Headset,
  Star,
} from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

// ONDC IGM 2.0 — Track Complaint and Complaint Resolved, restyled to the
// Component-page Figma: a case card with a Copy chip, a fixed five-step
// Progress Timeline, reassurance rows, and a refund details card with a
// rating row on resolution. One route for both states, because they are the
// same case at two points in its life.
//
// Nothing about the refund is inferred from the complaint state — an accepted
// resolution is not proof money moved, so the refund block only appears when
// there is an actual refund row, and it shows that row's status.
type Action = { code: string; description: string; at: string; by: string };
type Resolution = {
  id: string;
  itemId: string | null;
  type: string;
  amountPaise: number | null;
  description: string;
  customerDecision: string | null;
};
type Refund = {
  amountPaise: number;
  status: string;
  refundReference: string | null;
  completedAt: string | null;
};
type Complaint = {
  id: string;
  code: string;
  status: "OPEN" | "PROCESSING" | "RESOLVED" | "CLOSED";
  category: string;
  subCategory: string | null;
  description: string;
  orderId: string | null;
  escalationLevel: number;
  infoRequestedAt: string | null;
  infoRequest: string | null;
  createdAt: string;
  actions: Action[];
  resolutions: Resolution[];
  refunds: Refund[];
};

const STATUS_LABEL: Record<Complaint["status"], string> = {
  OPEN: "Complaint Submitted",
  PROCESSING: "Being Investigated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const fmt = (iso: string) =>
  `${new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • ${new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;

export default function ComplaintPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [orderTitle, setOrderTitle] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await api<{ complaint: Complaint }>(`/api/complaints/${params.id}`);
      setComplaint(d.complaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this complaint");
    }
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    api<{ complaint: Complaint }>(`/api/complaints/${params.id}`)
      .then((d) => {
        if (!cancelled) setComplaint(d.complaint);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load this complaint",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // The case card names the order the way the customer knows it.
  useEffect(() => {
    if (!complaint?.orderId) return;
    let cancelled = false;
    api<{ order: { title: string } }>(`/api/orders/${complaint.orderId}`)
      .then((d) => {
        if (!cancelled) setOrderTitle(d.order.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [complaint?.orderId]);

  async function sendInformation() {
    setBusy(true);
    try {
      await api(`/api/complaints/${params.id}/information`, {
        method: "POST",
        json: { message: reply.trim() },
      });
      setReply("");
      await load();
      toast("Information sent");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setBusy(false);
    }
  }

  async function decide(resolutionId: string, decision: "accept" | "reject") {
    setBusy(true);
    try {
      await api(`/api/complaints/${params.id}/resolution/${resolutionId}/${decision}`, {
        method: "POST",
      });
      await load();
      toast(decision === "accept" ? "Resolution accepted" : "Resolution rejected");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not record that");
    } finally {
      setBusy(false);
    }
  }

  async function escalate() {
    setBusy(true);
    try {
      const d = await api<{ level: number }>(`/api/complaints/${params.id}/escalate`, {
        method: "POST",
        json: { reason: "Not resolved to my satisfaction" },
      });
      await load();
      toast(d.level === 1 ? "Escalated to the grievance officer" : "Escalated to ONDC");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not escalate");
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!complaint) return;
    void navigator.clipboard?.writeText(complaint.code);
    toast("Complaint ID copied");
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-cream px-4 py-10 text-center">
        <p className="text-[15px] text-danger">{error}</p>
        <Link href="/history" className="mt-4 inline-block text-[14px] font-semibold text-accent">
          Back to Orders
        </Link>
      </div>
    );
  }
  if (!complaint) {
    return <div className="min-h-dvh bg-cream px-4 py-10 text-center text-muted">Loading...</div>;
  }

  const resolved = complaint.status === "RESOLVED" || complaint.status === "CLOSED";
  const investigating = complaint.status === "PROCESSING";
  const pending = complaint.resolutions.filter((r) => !r.customerDecision);
  const refund = complaint.refunds[0];
  const refundDone = !!refund && (refund.status === "completed" || !!refund.completedAt);

  // The design's fixed five-step ladder, derived from where the case actually
  // is. Timestamps come from the action trail where one plausibly matches.
  const steps: { label: string; done: boolean; at?: string }[] = [
    { label: "Complaint Submitted", done: true, at: complaint.createdAt },
    {
      label: "Complaint Acknowledged",
      done: investigating || resolved || complaint.actions.length > 1,
      at: complaint.actions[1]?.at,
    },
    { label: "Being Investigated", done: investigating || resolved },
    {
      label: "Resolved",
      done: resolved,
      at: resolved ? complaint.actions[complaint.actions.length - 1]?.at : undefined,
    },
    { label: "Refund Processed", done: refundDone, at: refund?.completedAt ?? undefined },
  ];

  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[680px] lg:px-6">
        <div className="flex items-center py-4">
          <Link
            href="/history"
            aria-label="Back"
            className="tap-target flex size-9 items-center justify-center rounded-full bg-card shadow-soft transition-colors hover:bg-beige/60"
          >
            <ArrowLeft size={18} className="text-ink" />
          </Link>
          <h1 className="flex-1 pr-9 text-center text-[17px] font-extrabold text-ink">
            {resolved ? "Complaint Resolved" : "Track Complaint"}
          </h1>
        </div>

        {resolved ? (
          <>
            <div className="pt-6 text-center">
              <h2 className="text-[24px] font-extrabold text-ink">
                Complaint Resolved
              </h2>
              <p className="mt-2 text-[14px] font-semibold text-ink">
                {refund
                  ? `Refund of ${rupees(refund.amountPaise)} has been ${refundDone ? "processed" : "initiated"}`
                  : "Your complaint has been resolved"}
              </p>
              {refund && (
                <p className="mt-1 text-[13px] text-muted">
                  It will reflect in 3-5 business days.
                </p>
              )}
            </div>

            {refund && (
              <div className="mt-7 rounded-[16px] bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    <span className="size-2 rounded-full bg-success" />
                    Refund Details
                  </p>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-bold",
                      refundDone
                        ? "bg-success-soft text-success"
                        : "bg-accent-soft text-accent",
                    )}
                  >
                    {refundDone && <Check size={11} strokeWidth={3} />}
                    {refundDone ? "Processed" : "Initiated"}
                  </span>
                </div>
                <dl className="mt-4 flex flex-col gap-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Refund Amount</dt>
                    <dd className="text-[16px] font-extrabold text-success">
                      {rupees(refund.amountPaise)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Refund To</dt>
                    <dd className="font-bold text-ink">Original payment method</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Complaint ID</dt>
                    <dd className="flex items-center gap-2 font-bold text-ink">
                      {complaint.code}
                      <button
                        onClick={copyCode}
                        className="flex items-center gap-1 rounded-pill border border-line px-2 py-0.5 text-[11px] font-semibold text-ink transition-colors hover:bg-beige/40"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Timeline</dt>
                    <dd className="font-bold text-ink">3-5 business days</dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between rounded-[16px] bg-card px-4 py-3.5 shadow-soft">
              <div>
                <p className="text-[14px] font-bold text-ink">Rate your experience</p>
                <p className="text-[12px] text-muted">How was our resolution?</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onClick={() => {
                      setStars(n);
                      toast("Thanks for the feedback");
                    }}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={18}
                      className={n <= stars ? "text-accent" : "text-line"}
                      fill={n <= stars ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Link
              href="/history"
              className="mt-7 flex h-[54px] w-full items-center justify-center rounded-[14px] border-[1.5px] border-acct-accent bg-card text-[15px] font-bold text-ink transition-colors hover:bg-accent-soft/40"
            >
              Done
            </Link>
            <Link
              href="/history"
              className="mt-4 block text-center text-[14px] font-bold text-ink hover:underline"
            >
              View all orders
            </Link>
          </>
        ) : (
          <>
            {/* Case card */}
            <div className="rounded-[16px] bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-bold text-ink">
                  Complaint ID: {complaint.code}
                </p>
                <button
                  onClick={copyCode}
                  className="flex shrink-0 items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:bg-beige/40"
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              {orderTitle && (
                <p className="mt-1.5 text-[13px] text-cocoa">Order: {orderTitle}</p>
              )}
              <p className="mt-0.5 text-[12px] text-muted">{fmt(complaint.createdAt)}</p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <p className="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <span className="size-2 rounded-full bg-ink" />
                  {STATUS_LABEL[complaint.status]}
                </p>
                <p className="flex items-center gap-1 text-[12px] text-muted">
                  <Clock size={12} /> Est. 24-48 hrs
                </p>
              </div>
              {complaint.escalationLevel > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-warning">
                  <ShieldAlert size={14} />
                  Escalated to {complaint.escalationLevel === 1 ? "the grievance officer" : "ONDC"}
                </p>
              )}
            </div>

            {/* Seller asked for something */}
            {complaint.infoRequestedAt && (
              <div className="mt-5 rounded-[16px] border border-warning/30 bg-card p-4 shadow-soft">
                <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <MessageSquare size={16} className="text-warning" />
                  More information needed
                </p>
                <p className="mt-1.5 text-[14px] text-cocoa">
                  {complaint.infoRequest ?? "The seller has asked for more detail."}
                </p>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value.slice(0, 2000))}
                  rows={3}
                  placeholder="Type your reply..."
                  className="mt-3 w-full resize-none rounded-[12px] border border-line bg-card p-3 text-[14px] text-ink outline-none focus:border-accent"
                />
                <button
                  disabled={busy || reply.trim().length < 2}
                  onClick={sendInformation}
                  className="mt-3 h-[46px] w-full rounded-[12px] border-[1.5px] border-acct-accent bg-card text-[14px] font-bold text-ink transition-colors hover:bg-accent-soft/40 disabled:opacity-40"
                >
                  Send information
                </button>
              </div>
            )}

            {/* Proposed resolutions */}
            {pending.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 px-1 text-[13px] font-semibold text-muted">
                  {pending.length > 1 ? "Choose a resolution" : "Proposed resolution"}
                </p>
                <div className="flex flex-col gap-3">
                  {pending.map((r) => (
                    <div key={r.id} className="rounded-[16px] bg-card p-4 shadow-soft">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-ink">
                            {r.description}
                          </p>
                          {r.itemId && (
                            <p className="mt-0.5 text-[12px] text-muted">
                              For item {r.itemId}
                            </p>
                          )}
                        </div>
                        {r.amountPaise != null && (
                          <span className="shrink-0 text-[17px] font-extrabold text-ink">
                            {rupees(r.amountPaise)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2.5">
                        <button
                          disabled={busy}
                          onClick={() => decide(r.id, "reject")}
                          className="h-[44px] flex-1 rounded-[12px] border border-line bg-card text-[14px] font-bold text-ink transition-colors hover:bg-beige/40 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => decide(r.id, "accept")}
                          className="h-[44px] flex-[2] rounded-[12px] border-[1.5px] border-acct-accent bg-card text-[14px] font-bold text-ink transition-colors hover:bg-accent-soft/40 disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Timeline — the design's five fixed steps */}
            <div className="mt-5 rounded-[16px] bg-card p-4 shadow-soft">
              <p className="text-[15px] font-bold text-ink">Progress Timeline</p>
              <ol className="mt-4">
                {steps.map((s, i) => {
                  const last = i === steps.length - 1;
                  const nextDone = steps[i + 1]?.done;
                  return (
                    <li key={s.label} className="relative flex gap-3 pb-6 last:pb-0">
                      {!last && (
                        <span
                          className={cn(
                            "absolute left-[11px] top-6 h-[calc(100%-24px)] w-0.5",
                            nextDone ? "bg-success" : "bg-line",
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                          s.done ? "bg-success text-white" : "border-2 border-line bg-card",
                        )}
                      >
                        {s.done && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span
                          className={cn(
                            "block text-[14px] font-bold",
                            s.done ? "text-ink" : "text-muted",
                          )}
                        >
                          {s.label}
                        </span>
                        {s.done && s.at && (
                          <span className="mt-0.5 block text-[12px] text-muted">
                            {fmt(s.at)}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Reassurance rows */}
            <div className="mt-5 flex flex-col gap-2.5">
              <div className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-4 py-3.5">
                <Clock size={17} className="shrink-0 text-ink" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-ink">
                    We are working on your complaint
                  </span>
                  <span className="block text-[12px] text-muted">
                    You will be notified once it is resolved
                  </span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-muted" />
              </div>
              <Link
                href="/profile/help"
                className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-4 py-3.5 transition-colors hover:bg-beige/30"
              >
                <Headset size={17} className="shrink-0 text-ink" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-ink">
                    Need immediate help?
                  </span>
                  <span className="block text-[12px] text-muted">
                    Chat with our support team
                  </span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-muted" />
              </Link>
            </div>

            {complaint.escalationLevel < 2 && (
              <button
                disabled={busy}
                onClick={escalate}
                className="mt-5 h-[50px] w-full rounded-[14px] border border-warning/40 bg-card text-[14px] font-bold text-warning transition-colors hover:bg-warning-soft disabled:opacity-50"
              >
                {complaint.escalationLevel === 0
                  ? "Escalate to grievance officer"
                  : "Escalate to ONDC"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
