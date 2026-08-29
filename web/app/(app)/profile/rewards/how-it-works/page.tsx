"use client";

import { useBackTo } from "@/lib/navHistory";
import Link from "next/link";
import { ArrowLeft, Percent, Wallet, Tag, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

// Offers & Rewards → How it works.
//
// Written to describe what the code actually does, not what a rewards page
// usually claims. Every line here is checkable against the wallet service: the
// share comes from platform config, cashback is credited once per completed
// order, and the ledger is what the balance is summed from.

const STEPS: { icon: typeof Percent; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: Percent, titleKey: "pp.rew.step1", bodyKey: "pp.rew.step1Body" },
  { icon: Wallet, titleKey: "pp.rew.step2", bodyKey: "pp.rew.step2Body" },
  { icon: Tag, titleKey: "pp.rew.step3", bodyKey: "pp.rew.step3Body" },
  { icon: ShieldCheck, titleKey: "pp.rew.step4", bodyKey: "pp.rew.step4Body" },
];

export default function HowRewardsWorkPage() {
  const goBack = useBackTo("/profile/rewards");
  const { t } = useI18n();

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center py-4">
          <button
            onClick={goBack}
            aria-label={t("common.back")}
            className="tap-target flex size-9 shrink-0 items-center justify-center rounded-full bg-card shadow-soft transition-colors hover:bg-acct-bg"
          >
            <ArrowLeft size={18} className="text-acct-ink" />
          </button>
          <h1 className="flex-1 pr-9 text-center text-[17px] font-extrabold text-acct-ink">
            {t("pp.rew.howTitle")}
          </h1>
        </div>

        <div className="flex flex-col gap-3">
          {STEPS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-[18px] bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint">
                  <Icon size={18} className="text-acct-accent" />
                </span>
                <p className="text-[15px] font-bold text-acct-ink">{t(titleKey)}</p>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-acct-muted">
                {t(bodyKey)}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-5 px-1 text-[12px] leading-relaxed text-acct-muted">
          {t("pp.rew.ratesNote")}
        </p>

        <Link
          href="/profile/rewards/history"
          className="mt-5 flex h-[52px] w-full items-center justify-center rounded-pill border border-line bg-card text-[15px] font-bold text-acct-ink transition-colors hover:bg-acct-bg"
        >
          {t("pp.rew.seeHistory")}
        </Link>
      </div>
    </div>
  );
}
