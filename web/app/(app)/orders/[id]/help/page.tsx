"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, Mail, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

// ONDC IGM 2.0 — raising a complaint (Figma 2286:4685 / 4686 / 4734).
//
// Three of the six screens in the guide, kept as steps on one route rather than
// three routes: the customer is filling in one form and the back button should
// walk them back through it, not out of the flow.
//
// The categories below are UI labels with our own internal codes. They are NOT
// ONDC enum values — the guide is explicit that those must come from the live
// spec, and inventing them would produce complaints the network rejects. The
// adapter maps these to the real vocabulary once we have it.
const PROBLEMS = [
  { code: "ORDER_NOT_RECEIVED", label: "Order not received" },
  { code: "WRONG_ITEM_DELIVERED", label: "Wrong item delivered" },
  { code: "ITEM_DAMAGED", label: "Item damaged" },
  { code: "REFUND_NOT_RECEIVED", label: "Refund not received" },
  { code: "PAYMENT_ISSUE", label: "Payment issue" },
  { code: "OTHER", label: "Other" },
] as const;

type Step = "problem" | "details" | "submitted";

export default function OrderHelpPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [step, setStep] = useState<Step>("problem");
  const [problem, setProblem] = useState<string>("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);

  const chosen = PROBLEMS.find((p) => p.code === problem);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const d = await api<{ complaint: { id: string; code: string } }>(
        "/api/complaints",
        {
          method: "POST",
          json: {
            orderId,
            // Category is the ONDC-facing field; sub-category carries the
            // specific problem until the real vocabulary is wired.
            category: "ORDER",
            subCategory: problem,
            description: description.trim(),
          },
        },
      );
      setCode(d.complaint.code);
      setComplaintId(d.complaint.id);
      setStep("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not raise the complaint");
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (step === "details") setStep("problem");
    else router.push(`/orders/${orderId}`);
  }

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[680px] lg:px-6">
        {step !== "submitted" && (
          <div className="flex items-center gap-3 py-5">
            <button
              onClick={back}
              aria-label="Back"
              className="rounded-full p-2 text-acct-ink transition-colors hover:bg-black/5"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[18px] font-extrabold text-acct-ink">
              {step === "problem" ? "Need Help" : "Add Details"}
            </h1>
          </div>
        )}

        {step === "problem" && (
          <>
            <div className="rounded-[16px] bg-white p-4 shadow-soft">
              <p className="text-[13px] text-acct-muted">Order</p>
              <p className="mt-0.5 font-mono text-[14px] font-semibold text-acct-ink">
                {orderId}
              </p>
            </div>

            <p className="mb-2 mt-6 px-1 text-[15px] font-bold text-acct-ink">
              What is the problem?
            </p>
            <div
              className="overflow-hidden rounded-[16px] bg-white shadow-soft"
              role="radiogroup"
              aria-label="What is the problem?"
            >
              {PROBLEMS.map((p, i) => {
                const active = problem === p.code;
                return (
                  <button
                    key={p.code}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setProblem(p.code)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                      i < PROBLEMS.length - 1 && "border-b border-black/5",
                      active ? "bg-igm-tint" : "hover:bg-acct-bg",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        active
                          ? "border-igm-accent bg-igm-accent"
                          : "border-black/20",
                      )}
                    >
                      {active && <Check size={12} className="text-white" strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "text-[15px]",
                        active ? "font-semibold text-igm-accent" : "text-acct-ink",
                      )}
                    >
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              disabled={!problem}
              onClick={() => setStep("details")}
              className="mt-7 h-[54px] w-full rounded-[14px] bg-igm-accent text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
          </>
        )}

        {step === "details" && (
          <>
            <div className="inline-flex items-center gap-2 rounded-pill bg-igm-tint px-3 py-1.5">
              <CircleAlert size={14} className="text-igm-accent" />
              <span className="text-[13px] font-semibold text-igm-accent">
                Issue: {chosen?.label}
              </span>
            </div>

            <label className="mt-6 block">
              <span className="text-[15px] font-bold text-acct-ink">
                Describe what happened
              </span>
              <textarea
                autoFocus
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                rows={6}
                placeholder="Tell us what went wrong…"
                className="mt-2 w-full resize-none rounded-[14px] border border-black/10 bg-white p-4 text-[15px] text-acct-ink outline-none focus:border-igm-accent focus:ring-2 focus:ring-igm-accent/15"
              />
              <span className="mt-1 block text-right text-[12px] text-acct-muted">
                {description.trim().length}/2000
              </span>
            </label>

            {/* The design offers an optional photo here. It is deliberately not
                shown yet: evidence needs a storage backend and a metadata
                record, and a picker that silently discarded the file would be
                worse than not offering one. Next change. */}

            {error && (
              <p role="alert" className="mt-3 text-[14px] text-danger">
                {error}
              </p>
            )}

            <button
              disabled={busy || description.trim().length < 5}
              onClick={submit}
              className="mt-6 h-[54px] w-full rounded-[14px] bg-igm-accent text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Submitting…" : "Submit Complaint"}
            </button>
          </>
        )}

        {step === "submitted" && (
          <div className="flex flex-col items-center pt-16 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-igm-good-tint">
              <Check size={38} className="text-igm-good" strokeWidth={3} />
            </span>
            <h1 className="mt-6 text-[24px] font-extrabold text-acct-ink">
              Complaint Submitted
            </h1>
            <p className="mt-2 text-[15px] text-igm-body">
              Complaint ID{" "}
              <span className="font-bold text-igm-accent">{code}</span>
            </p>
            <p className="mt-1 max-w-[320px] text-[14px] text-acct-muted">
              We&apos;ll update you as the seller responds.
            </p>

            <div className="mt-8 w-full overflow-hidden rounded-[16px] bg-white shadow-soft">
              <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3.5 text-left">
                <Mail size={18} className="shrink-0 text-igm-accent" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-acct-ink">
                    Email confirmation
                  </span>
                  <span className="block text-[12px] text-acct-muted">
                    Sent to your registered email
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5 text-left">
                <Clock size={18} className="shrink-0 text-igm-wait" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-acct-ink">
                    Resolution time
                  </span>
                  <span className="block text-[12px] text-acct-muted">
                    Expected within 24–48 hours
                  </span>
                </span>
              </div>
            </div>

            <Link
              href={`/complaints/${complaintId}`}
              className="mt-7 flex h-[54px] w-full items-center justify-center rounded-[14px] bg-igm-accent text-[16px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Track Complaint
            </Link>
            <Link
              href="/history"
              className="mt-3 text-[14px] font-semibold text-igm-accent hover:underline"
            >
              Back to orders
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
