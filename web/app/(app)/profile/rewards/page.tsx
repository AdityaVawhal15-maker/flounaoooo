"use client";

import { useEffect, useState } from "react";
import { PiggyBank, BadgePercent, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";

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
      <Card className="bg-accent-soft/60">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-white">
            <PiggyBank size={22} />
          </span>
          <div>
            <p className="text-[18px] font-bold text-ink">
              {savings ? rupees(savings.totalSavedPaise) : "—"} saved with Radiues
            </p>
            <p className="text-[12px] text-cocoa">
              {savings?.paidOrders
                ? `Across ${savings.paidOrders} order${savings.paidOrders === 1 ? "" : "s"} — versus the next-best option each time.`
                : "Every order shows exactly how much you saved versus the next-best option."}
            </p>
          </div>
        </div>
      </Card>

      <h2 className="mt-6 text-[14px] font-bold text-ink">Active offers</h2>
      <div className="mt-2 flex flex-col gap-2.5">
        <Card>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <BadgePercent size={15} className="text-accent" /> ONDC launch offer
          </p>
          <p className="mt-1 text-[12px] text-cocoa">
            Extra savings on in-app ONDC orders — applied automatically at checkout.
          </p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <Sparkles size={15} className="text-accent" /> Smart-pick guarantee
          </p>
          <p className="mt-1 text-[12px] text-cocoa">
            Every recommendation shows you exactly how much you saved versus the
            next-best option.
          </p>
        </Card>
      </div>
    </SubPage>
  );
}
