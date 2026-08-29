"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Percent, Wallet, Tag, ShieldCheck } from "lucide-react";

// Offers & Rewards → How it works.
//
// Written to describe what the code actually does, not what a rewards page
// usually claims. Every line here is checkable against the wallet service: the
// share comes from platform config, cashback is credited once per completed
// order, and the ledger is what the balance is summed from.

const STEPS = [
  {
    icon: Percent,
    title: "Order as usual",
    body: "Flouna earns a small margin when you order through it. A share of that margin comes back to you rather than staying with us.",
  },
  {
    icon: Wallet,
    title: "Cashback lands when the order completes",
    body: "Not when you pay, and not when you place it. Once the order is finished, the credit is added to your balance automatically, once per order.",
  },
  {
    icon: Tag,
    title: "Offer codes stack separately",
    body: "Applying a code from the offers list saves it for your next checkout, where the discount is calculated fresh on the server. Codes and cashback are independent of each other.",
  },
  {
    icon: ShieldCheck,
    title: "Every rupee is traceable",
    body: "Your balance is the sum of the entries in Reward History, never a number kept on its own. If a line looks wrong, it can be traced to the order that created it.",
  },
];

export default function HowRewardsWorkPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center py-4">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="tap-target flex size-9 shrink-0 items-center justify-center rounded-full bg-card shadow-soft transition-colors hover:bg-acct-bg"
          >
            <ArrowLeft size={18} className="text-acct-ink" />
          </button>
          <h1 className="flex-1 pr-9 text-center text-[17px] font-extrabold text-acct-ink">
            How it works
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[18px] bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint">
                  <Icon size={18} className="text-acct-accent" />
                </span>
                <p className="text-[15px] font-bold text-acct-ink">{title}</p>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-acct-muted">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 px-1 text-[12px] leading-relaxed text-acct-muted">
          Cashback rates are set by Flouna and can change. Whatever has already
          been credited stays yours.
        </p>

        <Link
          href="/profile/rewards/history"
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-pill border border-line bg-card text-[15px] font-bold text-acct-ink transition-colors hover:bg-acct-bg"
        >
          See your reward history
        </Link>
      </div>
    </div>
  );
}
