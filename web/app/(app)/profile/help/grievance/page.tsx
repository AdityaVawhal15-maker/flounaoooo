"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { SubPage } from "@/components/profile/SubPage";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

// Filing a formal grievance.
//
// Support policy 3.7 and privacy policy 10.3. This is the step above support:
// an officer is assigned within 48 hours, contacts you within 5 days, and the
// investigation concludes within 30. Those deadlines are published, so they are
// shown here, on the screen where somebody is deciding whether it is worth
// their time. A promise you have to go and find in a policy document is not
// really being made.

const CATEGORIES = [
  { value: "service", label: "Service" },
  { value: "refund", label: "Refund or payment" },
  { value: "privacy", label: "My data or privacy" },
  { value: "conduct", label: "How I was treated" },
  { value: "other", label: "Something else" },
] as const;

type Grievance = {
  id: string;
  reference: string;
  category: string;
  subject: string;
  status: string;
  outcome: string | null;
  assignBy: string;
  contactBy: string;
  investigateBy: string;
  resolvedAt: string | null;
  appealedAt: string | null;
  createdAt: string;
  breaches: {
    assignment: boolean;
    contact: boolean;
    investigation: boolean;
    appeal: boolean;
  };
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function GrievancePage() {
  const { toast } = useToast();
  const [list, setList] = useState<Grievance[] | null>(null);
  const [category, setCategory] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ grievances: Grievance[] }>("/api/privacy/grievances")
      .then((res) => setList(res.grievances))
      .catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  async function file() {
    setBusy(true);
    try {
      await api("/api/privacy/grievances", {
        method: "POST",
        json: { category, subject: subject.trim(), body: body.trim() },
      });
      setCategory("");
      setSubject("");
      setBody("");
      load();
      toast("Your grievance has been filed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not file that");
    } finally {
      setBusy(false);
    }
  }

  async function appeal(id: string) {
    try {
      await api(`/api/privacy/grievances/${id}/appeal`, { method: "POST" });
      load();
      toast("Your appeal has been recorded");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not appeal");
    }
  }

  const ready =
    category !== "" && subject.trim().length >= 3 && body.trim().length >= 10;

  return (
    <SubPage title="File a grievance">
      <p className="text-[13px] leading-relaxed text-acct-muted">
        For something support has not put right. A grievance officer is assigned
        within 48 hours, will contact you within 5 days, and the investigation
        concludes within 30 days. You can appeal the outcome once.
      </p>

      <section className="mt-5 rounded-2xl border border-acct-line bg-acct-card p-4">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-acct-ink">
          <ShieldAlert size={17} className="text-acct-accent" />
          What is this about?
        </h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? "" : c.value)}
              className={cn(
                "tap-target rounded-pill border px-3 py-2 text-[13px] transition-colors",
                category === c.value
                  ? "border-acct-accent bg-acct-accent text-white"
                  : "border-acct-line text-acct-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary"
          maxLength={140}
          className="mt-3 w-full rounded-xl border border-acct-line bg-acct-bg px-3.5 py-3 text-[16px] text-acct-ink outline-none focus:border-acct-accent"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="What happened, when, and what you would like done about it. Include order references if you have them."
          maxLength={4000}
          className="mt-2.5 w-full resize-none rounded-xl border border-acct-line bg-acct-bg px-3.5 py-3 text-[16px] leading-relaxed text-acct-ink outline-none focus:border-acct-accent"
        />

        <button
          type="button"
          onClick={file}
          disabled={busy || !ready}
          className="tap-target mt-3 w-full rounded-xl bg-acct-accent px-4 py-3 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "Filing…" : "File grievance"}
        </button>
      </section>

      {list && list.length > 0 && (
        <section className="mt-5">
          <h2 className="text-[15px] font-bold text-acct-ink">Your grievances</h2>
          <div className="mt-3 space-y-3">
            {list.map((g) => (
              <article
                key={g.id}
                className="rounded-2xl border border-acct-line bg-acct-card p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[13px] font-bold text-acct-ink">
                    {g.reference}
                  </span>
                  <span className="text-[12px] capitalize text-acct-muted">
                    {g.status}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-acct-ink">{g.subject}</p>

                <ul className="mt-2.5 space-y-1">
                  {[
                    ["Officer assigned by", g.assignBy, g.breaches.assignment],
                    ["Contact you by", g.contactBy, g.breaches.contact],
                    ["Investigation by", g.investigateBy, g.breaches.investigation],
                  ].map(([label, when, missed]) => (
                    <li
                      key={label as string}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <Clock
                        size={12}
                        className={missed ? "text-danger" : "text-acct-muted"}
                      />
                      <span className="text-acct-muted">{label as string}</span>
                      <span
                        className={cn(
                          "font-medium",
                          missed ? "text-danger" : "text-acct-ink",
                        )}
                      >
                        {day(when as string)}
                        {/* Said plainly when we have missed our own deadline.
                            Hiding it would not make it untrue, and the person
                            waiting already knows. */}
                        {missed ? " · overdue" : ""}
                      </span>
                    </li>
                  ))}
                </ul>

                {g.outcome && (
                  <p className="mt-2.5 rounded-xl bg-acct-bg p-3 text-[13px] leading-relaxed text-acct-ink">
                    {g.outcome}
                  </p>
                )}

                {g.status === "resolved" && !g.appealedAt && (
                  <button
                    type="button"
                    onClick={() => appeal(g.id)}
                    className="tap-target mt-3 text-[13px] font-bold text-acct-accent underline underline-offset-2"
                  >
                    Appeal this outcome
                  </button>
                )}
                {g.appealedAt && (
                  <p className="mt-2.5 text-[12px] text-acct-muted">
                    Appealed. A different reviewer decides within 15 days, and our
                    policy allows one internal appeal.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </SubPage>
  );
}
