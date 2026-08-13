"use client";

import { useState } from "react";
import { X, AlertTriangle, Check } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/cn";

// Cancellation (Figma 1967:223 modal, 2177:2843 confirm, 1967:262 cancelled,
// 1967:474 "Help us improve").
//
// The cancel endpoint already existed, complete with a reason field and refund
// flagging — but nothing in the app ever called it. This is the missing path.
//
// Three steps in one sheet rather than four screens: confirm, then why, then
// the outcome. Cancelling is a decision someone makes in a few seconds, and
// bouncing them between routes mid-decision would be worse than a sheet they
// can dismiss.
//
// The reason is collected AFTER the cancellation is committed, not before.
// Holding a cancellation hostage to a survey would be hostile, and the endpoint
// accepts the reason on the same call — so the request is sent once the person
// has either answered or skipped.
const REASONS = [
  "Changed my mind",
  "Taking too long",
  "Ordered by mistake",
  "Found a better price",
  "Wrong address or details",
  "Other",
] as const;

type Step = "confirm" | "reason" | "done";

export function CancelOrderSheet({
  orderId,
  domain,
  onClose,
  onCancelled,
}: {
  orderId: string;
  domain: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [step, setStep] = useState<Step>("confirm");
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRide = domain === "ride";
  const noun = isRide ? "booking" : "order";

  async function cancel(withReason?: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        json: withReason ? { reason: withReason } : {},
      });
      onCancelled();
      setStep("done");
    } catch (err) {
      // The server enforces the real rules — food already out for delivery,
      // a completed trip, an already-cancelled order. Surfaced as-is rather
      // than guessed at in the client, which would drift from the policy.
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : `Could not cancel this ${noun}`,
      );
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Cancel ${noun}`}
      onClick={(e) => {
        // Only a click on the backdrop itself dismisses.
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-[420px] rounded-t-[24px] bg-card p-6 shadow-lift sm:rounded-[24px]">
        {step === "confirm" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <AlertTriangle size={24} className="text-danger" />
              </span>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-full p-1.5 text-cocoa transition-colors hover:bg-beige"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="mt-4 text-[20px] font-bold text-ink">
              Cancel this {noun}?
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-cocoa">
              {isRide
                ? "Your driver will be notified and the booking will end."
                : "The restaurant will stop preparing your order."}{" "}
              If you&apos;ve already paid, a refund will be started
              automatically.
            </p>

            {error && (
              <p role="alert" className="mt-3 text-[14px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                disabled={busy}
                onClick={() => setStep("reason")}
                className="h-[52px] w-full rounded-pill bg-danger text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Yes, cancel {noun}
              </button>
              <button
                disabled={busy}
                onClick={onClose}
                className="h-[52px] w-full rounded-pill border border-line bg-card text-[16px] font-bold text-ink transition-colors hover:bg-beige/40 disabled:opacity-50"
              >
                Keep my {noun}
              </button>
            </div>
          </>
        )}

        {step === "reason" && (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[20px] font-bold text-ink">
                Help us improve
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                disabled={busy}
                className="-mr-1 -mt-1 rounded-full p-1.5 text-cocoa transition-colors hover:bg-beige"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-1.5 text-[14px] text-cocoa">
              Why are you cancelling? This is optional.
            </p>

            <div className="mt-4 flex flex-col gap-2" role="radiogroup">
              {REASONS.map((r) => {
                const active = reason === r;
                return (
                  <button
                    key={r}
                    role="radio"
                    aria-checked={active}
                    disabled={busy}
                    onClick={() => setReason(r)}
                    className={cn(
                      "flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left text-[15px] transition-colors",
                      active
                        ? "border-accent bg-accent-soft/60 font-semibold text-accent"
                        : "border-line text-ink hover:bg-beige/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        active ? "border-accent bg-accent" : "border-cocoa/30",
                      )}
                    >
                      {active && (
                        <Check size={12} className="text-white" strokeWidth={3} />
                      )}
                    </span>
                    {r}
                  </button>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[14px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                disabled={busy}
                onClick={() => cancel(reason || undefined)}
                className="h-[52px] w-full rounded-pill bg-danger text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Cancelling…" : "Confirm cancellation"}
              </button>
              <button
                disabled={busy}
                onClick={() => cancel()}
                className="h-[46px] w-full text-[15px] font-semibold text-cocoa transition-colors hover:text-ink disabled:opacity-50"
              >
                Skip and cancel
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-success/10">
              <Check size={32} className="text-success" strokeWidth={3} />
            </span>
            <h2 className="mt-5 text-[20px] font-bold text-ink">
              {isRide ? "Booking cancelled" : "Order cancelled"}
            </h2>
            <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-cocoa">
              {/* Deliberately not claiming the money is back. The server flags a
                  paid order for refund; when it actually lands is not something
                  this screen knows. */}
              If you paid for this {noun}, your refund has been started and will
              show in your original payment method.
            </p>
            <button
              onClick={onClose}
              className="mt-6 h-[52px] w-full rounded-pill bg-ink text-[16px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
