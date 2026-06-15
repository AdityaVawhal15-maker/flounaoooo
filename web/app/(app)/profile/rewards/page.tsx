"use client";

import { useEffect, useState } from "react";
import { PiggyBank, BadgePercent, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";
import { CountUp } from "@/components/ui/CountUp";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

type Savings = { totalSavedPaise: number; paidOrders: number };

export default function RewardsPage() {
  const [savings, setSavings] = useState<Savings | null>(null);

  useEffect(() => {
    api<Savings>("/api/users/savings")
      .then(setSavings)
      .catch(() => setSavings({ totalSavedPaise: 0, paidOrders: 0 }));
  }, []);

  return (
    <SubPage title="Rewards and Offers">
      <FadeIn y={10}>
        <div
          className="relative overflow-hidden rounded-card p-5 text-white shadow-lift"
          style={{ background: "linear-gradient(135deg, #ff8a4c 0%, #e8651a 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/15 blur-2xl"
          />
          <div className="relative flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-white/20 backdrop-blur">
              <PiggyBank size={24} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-white/80">Total saved with Radiues</p>
              <p className="text-[30px] font-bold leading-tight tracking-tight">
                {savings ? (
                  <CountUp
                    value={savings.totalSavedPaise}
                    format={(n) => rupees(Math.round(n))}
                  />
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
          <p className="relative mt-3 text-[12px] text-white/85">
            {savings?.paidOrders
              ? `Across ${savings.paidOrders} order${savings.paidOrders === 1 ? "" : "s"} — versus the next-best option each time.`
              : "Every order shows exactly how much you saved versus the next-best option."}
          </p>
        </div>
      </FadeIn>

      <h2 className="mt-6 text-[14px] font-bold text-ink">Active offers</h2>
      <Stagger delayChildren={0.15} className="mt-2 flex flex-col gap-2.5">
        <StaggerItem>
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-card">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <BadgePercent size={15} className="text-accent" /> ONDC launch offer
            </p>
            <p className="mt-1 text-[12px] text-cocoa">
              Extra savings on in-app ONDC orders — applied automatically at checkout.
            </p>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-card">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <Sparkles size={15} className="text-accent" /> Smart-pick guarantee
            </p>
            <p className="mt-1 text-[12px] text-cocoa">
              Every recommendation shows you exactly how much you saved versus the
              next-best option.
            </p>
          </Card>
        </StaggerItem>
      </Stagger>
    </SubPage>
  );
}
