"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Clock, MessageSquare, ShieldAlert, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

// ONDC IGM 2.0 — Track Complaint and Complaint Resolved (Figma 2288:4781,
// 2290:1512). One route, because they are the same case at two points in its
// life; splitting them would mean the customer's link changes when the seller
// responds.
//
// Everything rendered here comes from the complaint record. Nothing about the
// refund is inferred from the complaint state — the guide is explicit that an
// accepted resolution is not proof money moved, so the refund block only
// appears when there is an actual refund row, and it shows that row's status.
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
  OPEN: "Open",
  PROCESSING: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function ComplaintPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  // Refresh after the customer acts (reply, accept, escalate) so the timeline
  // and status reflect what just happened.
  const load = useCallback(async () => {
    try {
      const d = await api<{ complaint: Complaint }>(`/api/complaints/${params.id}`);
      setComplaint(d.complaint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this complaint");
    }
  }, [params.id]);

  // Initial load. Written as a promise chain rather than calling load() so the
  // state updates stay in callbacks, and guarded so a slow response can't land
  // after the view is gone.
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

  if (error) {
    return (
      <div className="min-h-dvh bg-acct-bg px-4 py-10 text-center">
        <p className="text-[15px] text-danger">{error}</p>
        <Link href="/history" className="mt-4 inline-block text-[14px] font-semibold text-igm-accent">
          Back to orders
        </Link>
      </div>
    );
  }
  if (!complaint) {
    return <div className="min-h-dvh bg-acct-bg px-4 py-10 text-center text-acct-muted">Loading…</div>;
  }

  const resolved = complaint.status === "RESOLVED" || complaint.status === "CLOSED";
  const pending = complaint.resolutions.filter((r) => !r.customerDecision);
  const refund = complaint.refunds[0];

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[680px] lg:px-6">
        <div className="flex items-center gap-3 py-5">
          <Link
            href="/history"
            aria-label="Back"
            className="rounded-full p-2 text-acct-ink transition-colors hover:bg-black/5"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-[18px] font-extrabold text-acct-ink">
            {resolved ? "Complaint Resolved" : "Track Complaint"}
          </h1>
        </div>

        {/* Case header */}
        <div className="rounded-[16px] bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] text-acct-muted">Complaint ID</p>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(complaint.code);
                  toast("Complaint ID copied");
                }}
                className="mt-0.5 flex items-center gap-1.5 text-[15px] font-bold text-igm-accent"
              >
                {complaint.code}
                <Copy size={13} />
              </button>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-pill px-3 py-1 text-[12px] font-bold",
                resolved
                  ? "bg-igm-good-tint text-igm-good"
                  : "bg-igm-tint text-igm-accent",
              )}
            >
              {STATUS_LABEL[complaint.status]}
            </span>
          </div>
          <p className="mt-3 border-t border-black/5 pt-3 text-[14px] text-igm-body">
            {complaint.description}
          </p>
          {complaint.escalationLevel > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-igm-wait">
              <ShieldAlert size={14} />
              Escalated to {complaint.escalationLevel === 1 ? "the grievance officer" : "ONDC"}
            </p>
          )}
        </div>

        {/* Seller asked for something — the reply state the guide calls out */}
        {complaint.infoRequestedAt && (
          <div className="mt-5 rounded-[16px] border border-igm-wait/30 bg-white p-4 shadow-soft">
            <p className="flex items-center gap-2 text-[15px] font-bold text-acct-ink">
              <MessageSquare size={16} className="text-igm-wait" />
              More information needed
            </p>
            <p className="mt-1.5 text-[14px] text-igm-body">
              {complaint.infoRequest ?? "The seller has asked for more detail."}
            </p>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Type your reply…"
              className="mt-3 w-full resize-none rounded-[12px] border border-black/10 bg-white p-3 text-[14px] text-acct-ink outline-none focus:border-igm-accent focus:ring-2 focus:ring-igm-accent/15"
            />
            <button
              disabled={busy || reply.trim().length < 2}
              onClick={sendInformation}
              className="mt-3 h-[46px] w-full rounded-[12px] bg-igm-accent text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Send information
            </button>
          </div>
        )}

        {/* Proposed resolutions — a list, and possibly per item */}
        {pending.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 px-1 text-[13px] font-semibold text-acct-muted">
              {pending.length > 1 ? "Choose a resolution" : "Proposed resolution"}
            </p>
            <div className="flex flex-col gap-3">
              {pending.map((r) => (
                <div key={r.id} className="rounded-[16px] bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-acct-ink">
                        {r.description}
                      </p>
                      {r.itemId && (
                        <p className="mt-0.5 text-[12px] text-acct-muted">
                          For item {r.itemId}
                        </p>
                      )}
                    </div>
                    {r.amountPaise != null && (
                      <span className="shrink-0 text-[17px] font-extrabold text-acct-ink">
                        {rupees(r.amountPaise)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2.5">
                    <button
                      disabled={busy}
                      onClick={() => decide(r.id, "reject")}
                      className="h-[44px] flex-1 rounded-[12px] border border-black/10 bg-white text-[14px] font-bold text-acct-ink transition-colors hover:bg-acct-bg disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => decide(r.id, "accept")}
                      className="h-[44px] flex-[2] rounded-[12px] bg-igm-accent text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refund — shown only when a refund record exists, and reporting that
            record's own status rather than assuming acceptance meant payment */}
        {refund && (
          <div className="mt-5 rounded-[16px] bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-acct-ink">Refund Details</p>
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 text-[11px] font-bold capitalize",
                  refund.status === "completed"
                    ? "bg-igm-good-tint text-igm-good"
                    : "bg-igm-tint text-igm-accent",
                )}
              >
                {refund.status}
              </span>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-acct-muted">Refund amount</dt>
                <dd className="text-[16px] font-extrabold text-igm-good">
                  {rupees(refund.amountPaise)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-acct-muted">Reference</dt>
                <dd className="font-semibold text-acct-ink">
                  {refund.refundReference ?? "Assigned once processed"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-acct-muted">Timeline</dt>
                <dd className="font-semibold text-igm-wait">
                  {refund.completedAt ? "Completed" : "3–5 business days"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Action trail — plain language, never raw protocol JSON */}
        <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-acct-muted">
          Progress
        </p>
        <ol className="overflow-hidden rounded-[16px] bg-white shadow-soft">
          {complaint.actions.map((a, i) => {
            const last = i === complaint.actions.length - 1;
            return (
              <li
                key={`${a.code}-${a.at}`}
                className={cn(
                  "flex gap-3 px-4 py-3.5",
                  !last && "border-b border-black/5",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    last && !resolved
                      ? "bg-igm-tint text-igm-accent"
                      : "bg-igm-good-tint text-igm-good",
                  )}
                >
                  {last && !resolved ? <Clock size={13} /> : <Check size={13} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-acct-ink">
                    {a.description}
                  </span>
                  <span className="block text-[12px] text-acct-muted">
                    {new Date(a.at).toLocaleString()}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        {!resolved && complaint.escalationLevel < 2 && (
          <button
            disabled={busy}
            onClick={escalate}
            className="mt-5 h-[50px] w-full rounded-[14px] border border-igm-wait/40 bg-white text-[15px] font-bold text-igm-wait transition-colors hover:bg-igm-wait/5 disabled:opacity-50"
          >
            {complaint.escalationLevel === 0
              ? "Escalate to grievance officer"
              : "Escalate to ONDC"}
          </button>
        )}

        <Link
          href="/history"
          className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[14px] bg-acct-ink text-[15px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
