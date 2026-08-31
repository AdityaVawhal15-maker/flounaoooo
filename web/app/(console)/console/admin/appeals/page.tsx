"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserCheck, Clock, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

// Challenges to what the decision engine chose.
//
// AI policy 2.5 promises a review within five business days. 2.6 is the one
// with legal weight: a person may require that a human looks at a decision an
// automated system made about them.
//
// Which is why this screen exists at all, and why it cannot be automated. An
// appeal closed by the same ranking code that produced the decision is not a
// human review however good the answer is. The reviewer recorded against an
// answer is the signed-in operator, taken from the session rather than typed,
// because a name somebody could type is not evidence a person was involved.
//
// Rows where a human was explicitly asked for are marked and sorted up. That
// request carries the legal weight, so it should not sit behind a pile of
// ordinary feedback simply because it arrived later.

type Appeal = {
  id: string;
  reason: string;
  wanted: string | null;
  humanReviewRequested: boolean;
  status: string;
  dueBy: string;
  orderId: string | null;
  response: string | null;
  respondedAt: string | null;
  reviewerId: string | null;
  createdAt: string;
  overdue: boolean;
  user: { id: string; name: string; email: string };
};

const WANTED_COPY: Record<string, string> = {
  cheaper: "wanted it cheaper",
  faster: "wanted it faster",
  better_rated: "wanted a better rated seller",
  different_seller: "wanted a different seller",
  wrong_price: "says the price was wrong",
  unavailable: "says it was unavailable",
  other: "something else",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminAppealsPage() {
  const state = useOperator(["admin", "super_admin"]);
  const [rows, setRows] = useState<Appeal[]>([]);
  const [showAnswered, setShowAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [response, setResponse] = useState("");

  // Loading is only ever cleared here, never set inside the effect: the
  // rows already on screen stay put while a refresh is in flight, which
  // is what the other console queues do and avoids the queue blanking
  // every time somebody ticks a filter.
  const load = useCallback(() => {
    api<{ appeals: Appeal[] }>(
      `/api/console/admin/appeals${showAnswered ? "?all=1" : ""}`,
    )
      .then((d) => setRows(d.appeals))
      .then(() => setFailed(false))
      // An empty queue and a queue that failed to load look identical
      // once both render zero rows, and on this screen that difference
      // is whether somebody is working the cases or watching deadlines
      // pass believing there is nothing to do.
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [showAnswered]);
  useEffect(load, [load]);

  async function answer(id: string) {
    setBusy(id);
    try {
      await api(`/api/console/admin/appeals/${id}/answer`, {
        method: "POST",
        json: { response: response.trim() },
      });
      setDrafting(null);
      setResponse("");
      load();
    } catch {
      // Deliberately leaves the draft in place so nothing typed is lost.
    } finally {
      setBusy(null);
    }
  }

  const overdueCount = rows.filter((r) => r.overdue).length;
  const humanCount = rows.filter((r) => r.humanReviewRequested && !r.respondedAt).length;

  // Same guard the other console screens use: nothing renders until the role
  // is confirmed, so a denied operator never sees a queue flash by first.
  if (state.status !== "ok") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-(--c-muted)">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ConsoleShell operator={state.operator}>
      <PageTitle
        title="Decision appeals"
        subtitle="People who disagreed with what the engine picked. Answered by a person, within five business days."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-(--c-red)/10 px-3 py-1.5 text-[13px] font-bold text-(--c-red)">
            <AlertTriangle size={14} />
            {overdueCount} past the five day promise
          </span>
        )}
        {humanCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-(--c-maroon)/10 px-3 py-1.5 text-[13px] font-bold text-(--c-maroon)">
            <UserCheck size={14} />
            {humanCount} asked for a person
          </span>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-(--c-muted)">
          <input
            type="checkbox"
            checked={showAnswered}
            onChange={(e) => setShowAnswered(e.target.checked)}
            className="size-4 accent-(--c-maroon)"
          />
          Include answered
        </label>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-[14px] text-(--c-muted)">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </p>
      ) : failed ? (
        <div className="rounded-xl border border-(--c-red)/40 bg-(--c-red)/5 p-4">
          <p className="flex items-center gap-2 text-[14px] font-bold text-(--c-red)">
            <AlertTriangle size={15} />
            This queue could not be loaded
          </p>
          <p className="mt-1 text-[13px] text-(--c-muted)">
            Do not read this as an empty queue. Cases may be waiting and
            their deadlines are still running.
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg border border-(--c-line) px-3 py-2 text-[13px] font-medium text-(--c-ink)"
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[14px] text-(--c-muted)">No appeals waiting.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <article
              key={a.id}
              className="rounded-xl border border-(--c-line) bg-(--c-surface) p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[13px] font-medium text-(--c-ink)">
                  {a.user.name}
                </span>
                <span className="text-[12px] text-(--c-muted)">{a.user.email}</span>
                {a.humanReviewRequested && (
                  <span className="flex items-center gap-1 rounded-full bg-(--c-maroon)/10 px-2 py-0.5 text-[11px] font-bold text-(--c-maroon)">
                    <UserCheck size={11} />
                    asked for a person
                  </span>
                )}
              </div>

              <p className="mt-2 text-[14px] leading-relaxed text-(--c-ink)">
                {a.reason}
              </p>
              {a.wanted && (
                <p className="mt-1 text-[12px] text-(--c-muted)">
                  Tagged: {WANTED_COPY[a.wanted] ?? a.wanted}
                </p>
              )}

              <p
                className={`mt-2 flex items-center gap-1.5 text-[12px] ${
                  a.overdue ? "text-(--c-red)" : "text-(--c-muted)"
                }`}
              >
                <Clock size={12} />
                Due {when(a.dueBy)}
                {a.overdue ? " · overdue" : ""}
              </p>

              {a.respondedAt ? (
                <div className="mt-3 rounded-lg bg-(--c-ivory) p-3">
                  <p className="text-[13px] leading-relaxed text-(--c-ink)">
                    {a.response}
                  </p>
                  <p className="mt-1.5 text-[11px] text-(--c-muted)">
                    Reviewed by {a.reviewerId} on {when(a.respondedAt)}
                  </p>
                </div>
              ) : drafting === a.id ? (
                <div className="mt-3">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={3}
                    placeholder="Your answer, in your own words. The customer reads this."
                    className="w-full resize-none rounded-lg border border-(--c-line) bg-(--c-ivory) px-3 py-2 text-[13px] text-(--c-ink) outline-none focus:border-(--c-maroon)"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDrafting(null);
                        setResponse("");
                      }}
                      className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] text-(--c-ink)"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy === a.id || response.trim().length < 5}
                      onClick={() => answer(a.id)}
                      className="rounded-lg bg-(--c-maroon) hover:bg-[#690a17] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      Send answer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDrafting(a.id)}
                  className="mt-3 rounded-lg bg-(--c-maroon) hover:bg-[#690a17] px-3 py-2 text-[13px] font-bold text-white"
                >
                  Answer this
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
