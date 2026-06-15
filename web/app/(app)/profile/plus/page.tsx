"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, Crown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { SubPage } from "@/components/profile/SubPage";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

type PlusStatus = {
  active: boolean;
  since: string | null;
  until: string | null;
  pricePaise: number;
  perks: string[];
};

export default function PlusPage() {
  const [status, setStatus] = useState<PlusStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<PlusStatus>("/api/subscription")
      .then(setStatus)
      .catch(() => setStatus(null));

  useEffect(() => {
    load();
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      await api("/api/subscription/subscribe", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api("/api/subscription/cancel", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubPage title="Radiues Plus">
      <FadeIn y={10}>
        <div
          className="relative overflow-hidden rounded-card p-5 text-white shadow-lift"
          style={{ background: "linear-gradient(135deg,#3d1c00,#6b3410)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-accent/30 blur-2xl"
          />
          <div className="relative flex items-center gap-2">
            <Crown size={20} className="text-accent" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-accent">
              Radiues Plus
            </span>
          </div>
          <p className="relative mt-2 text-[26px] font-bold leading-tight">
            {status ? rupees(status.pricePaise) : "—"}
            <span className="text-[14px] font-medium text-white/70"> / month</span>
          </p>
          <p className="relative mt-1 text-[12px] text-white/75">
            Live tracking, the driver map and best-price AI are always free.
            Plus adds the extras below.
          </p>
          {status?.active && (
            <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-pill bg-success/20 px-2.5 py-1 text-[11px] font-semibold text-[#7ef0b0]">
              <Check size={12} /> Active
              {status.until
                ? ` until ${new Date(status.until).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""}
            </span>
          )}
        </div>
      </FadeIn>

      <Stagger delayChildren={0.1} className="mt-5 flex flex-col gap-2.5">
        {(status?.perks ?? []).map((perk) => (
          <StaggerItem key={perk}>
            <div className="flex items-center gap-3 rounded-card border border-line/70 bg-card px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                <Sparkles size={14} className="text-accent" />
              </span>
              <p className="text-[13px] font-medium text-ink">{perk}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-6">
        {status?.active ? (
          <button
            onClick={cancel}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-pill border border-line bg-card py-3 text-[14px] font-semibold text-cocoa transition-colors hover:bg-beige/40 disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            Cancel subscription
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-pill bg-ink py-3.5 text-[15px] font-semibold text-white shadow-lift transition-colors hover:bg-[#2c1500] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Crown size={16} className="text-accent" />
            )}
            {status ? `Get Plus for ${rupees(status.pricePaise)}/mo` : "Get Plus"}
          </button>
        )}
      </div>
    </SubPage>
  );
}
