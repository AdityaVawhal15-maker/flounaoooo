"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useOperator } from "@/components/console/useOperator";
import { ConsoleShell, PageTitle } from "@/components/console/ConsoleShell";

// The grievance queue.
//
// The ONDC complaints screen next door is about protocol traffic: what the
// seller acknowledged, what the network sent back. This screen is about the
// four promises we published to the customer, each with a clock:
//
//   assigned to an officer   48 hours
//   officer makes contact    5 days
//   investigation concludes  30 days
//   an appeal is decided     15 days
//
// Until this existed those clocks ran with nobody able to stop them. A person
// could raise a grievance, be promised an officer within two days, and there
// was no button anywhere in the product that assigned one.
//
// Sorted by what is owed soonest, not by when the case arrived, and one
// obligation is shown at a time. Four dates per row makes an operator work out
// which matters; the next one makes it obvious.

type Grievance = {
  id: string;
  code: string;
  status: string;
  category: string;
  subCategory: string | null;
  orderId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  assignedAt: string | null;
  contactedAt: string | null;
  officerId: string | null;
  appealedAt: string | null;
  appealDueBy: string | null;
  appealOutcome: string | null;
  user: { id: string; name: string; email: string };
  next: { label: string; due: string | null; overdue: boolean };
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminGrievancesPage() {
  const state = useOperator(["admin", "super_admin"]);
  const [rows, setRows] = useState<Grievance[]>([]);
  const [showSettled, setShowSettled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");

  // Loading is only ever cleared here, never set inside the effect: the
  // rows already on screen stay put while a refresh is in flight, which
  // is what the other console queues do and avoids the queue blanking
  // every time somebody ticks a filter.
  const load = useCallback(() => {
    api<{ grievances: Grievance[] }>(
      `/api/console/admin/grievances${showSettled ? "?all=1" : ""}`,
    )
      .then((d) => setRows(d.grievances))
      .then(() => setFailed(false))
      // An empty queue and a queue that failed to load look identical
      // once both render zero rows, and on this screen that difference
      // is whether somebody is working the cases or watching deadlines
      // pass believing there is nothing to do.
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [showSettled]);
  useEffect(load, [load]);

  async function act(id: string, path: string, body?: unknown) {
    setBusy(id);
    try {
      await api(`/api/console/admin/grievances/${id}/${path}`, {
        method: "POST",
        ...(body ? { json: body } : {}),
      });
      setDrafting(null);
      setOutcome("");
      load();
    } catch {
      // Left on screen rather than cleared: the operator should see the row
      // did not move, not a queue that silently reordered around a failure.
    } finally {
      setBusy(null);
    }
  }

  const overdueCount = rows.filter((r) => r.next.overdue).length;

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
        title="Grievances"
        subtitle="The deadlines we published, and what is owed next on each case."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* The number that matters most, stated plainly. A queue that hides how
            far behind it is lets a breach become a surprise. */}
        {overdueCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-(--c-red)/10 px-3 py-1.5 text-[13px] font-bold text-(--c-red)">
            <AlertTriangle size={14} />
            {overdueCount} past a published deadline
          </span>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-(--c-muted)">
          <input
            type="checkbox"
            checked={showSettled}
            onChange={(e) => setShowSettled(e.target.checked)}
            className="size-4 accent-(--c-maroon)"
          />
          Include settled cases
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
        <p className="text-[14px] text-(--c-muted)">Nothing outstanding.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((g) => (
            <article
              key={g.id}
              className="rounded-xl border border-(--c-line) bg-(--c-surface) p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[13px] font-bold text-(--c-ink)">
                  {g.code}
                </span>
                <span className="text-[12px] uppercase tracking-wide text-(--c-muted)">
                  {g.status}
                </span>
                <span className="text-[13px] text-(--c-muted)">
                  {g.user.name} · {g.user.email}
                </span>
                {g.orderId && (
                  <Link
                    href={`/console/admin/orders?q=${g.orderId}`}
                    className="text-[12px] text-(--c-maroon) hover:underline"
                  >
                    order
                  </Link>
                )}
              </div>

              <p
                className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${
                  g.next.overdue ? "text-(--c-red)" : "text-(--c-ink)"
                }`}
              >
                <Clock size={13} />
                {g.next.label}
                {g.next.due && (
                  <span className="font-normal text-(--c-muted)">
                    by {when(g.next.due)}
                    {g.next.overdue ? " · overdue" : ""}
                  </span>
                )}
              </p>

              {g.officerId && (
                <p className="mt-1 text-[12px] text-(--c-muted)">
                  Officer: {g.officerId}
                </p>
              )}

              {drafting === g.id ? (
                <div className="mt-3">
                  <textarea
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    rows={3}
                    placeholder="What was found, and what is being done. This is given to the customer."
                    className="w-full resize-none rounded-lg border border-(--c-line) bg-(--c-ivory) px-3 py-2 text-[13px] text-(--c-ink) outline-none focus:border-(--c-maroon)"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDrafting(null);
                        setOutcome("");
                      }}
                      className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] text-(--c-ink)"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy === g.id || outcome.trim().length < 5}
                      onClick={() =>
                        act(
                          g.id,
                          g.appealedAt && !g.appealOutcome ? "appeal/decide" : "conclude",
                          { outcome: outcome.trim() },
                        )
                      }
                      className="rounded-lg bg-(--c-maroon) hover:bg-[#690a17] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      {g.appealedAt && !g.appealOutcome ? "Decide appeal" : "Conclude"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!g.assignedAt && (
                    <button
                      type="button"
                      disabled={busy === g.id}
                      onClick={() => act(g.id, "assign", { officerId: state.operator.email })}
                      className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] font-medium text-(--c-ink) disabled:opacity-50"
                    >
                      Assign to me
                    </button>
                  )}
                  {!g.contactedAt && (
                    <button
                      type="button"
                      disabled={busy === g.id}
                      onClick={() => act(g.id, "contacted")}
                      className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] font-medium text-(--c-ink) disabled:opacity-50"
                    >
                      Mark contacted
                    </button>
                  )}
                  {!g.resolvedAt && (
                    <button
                      type="button"
                      disabled={busy === g.id}
                      onClick={() => setDrafting(g.id)}
                      className="rounded-lg bg-(--c-maroon) hover:bg-[#690a17] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      Conclude
                    </button>
                  )}
                  {g.resolvedAt && !g.appealedAt && (
                    <button
                      type="button"
                      disabled={busy === g.id}
                      onClick={() => act(g.id, "appeal")}
                      className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] font-medium text-(--c-ink) disabled:opacity-50"
                    >
                      Customer is appealing
                    </button>
                  )}
                  {g.appealedAt && !g.appealOutcome && (
                    <button
                      type="button"
                      disabled={busy === g.id}
                      onClick={() => setDrafting(g.id)}
                      className="rounded-lg bg-(--c-maroon) hover:bg-[#690a17] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      Decide appeal
                    </button>
                  )}
                  <Link
                    href={`/console/admin/complaints?case=${g.id}`}
                    className="rounded-lg border border-(--c-line) px-3 py-2 text-[13px] text-(--c-muted)"
                  >
                    Protocol log
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
