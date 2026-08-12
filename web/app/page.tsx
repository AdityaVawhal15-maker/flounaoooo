"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { useI18n } from "@/components/i18n/I18nContext";

// Public landing — matches the Figma "intial landing page" frame. The static
// prerender is English (SEO keeps indexing English copy); a returning
// visitor's saved language applies after hydration like the rest of the app.
export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-cream px-6 py-12">
      {/* Mobile keeps the Figma column exactly; desktop scales the same
          composition up so a wide screen doesn't show a narrow phone strip. */}
      <div className="flex w-full max-w-sm flex-col items-center text-center lg:max-w-2xl">
        <FadeIn y={16}>
          <Image
            src="/logo.png"
            alt="Flouna"
            width={230}
            height={230}
            priority
            className="lg:h-[280px] lg:w-[280px]"
            style={{ filter: "drop-shadow(0 6px 14px rgba(61,28,0,0.18))" }}
          />
        </FadeIn>

        {/* Hero — Stop Searching (ink) / Start Deciding (accent), Inter Bold 28 */}
        <FadeIn delay={0.1} className="mt-7">
          <h1 className="flex flex-col gap-2 text-[28px] font-bold leading-[1.2] lg:text-[52px]">
            <span className="text-ink">{t("landing.headline1")}</span>
            <span className="text-accent">{t("landing.headline2")}</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-3.5">
          <p className="mx-auto max-w-[330px] text-[15px] leading-[1.5] text-cocoa lg:max-w-[520px] lg:text-[18px]">
            {t("landing.blurb")}
          </p>
        </FadeIn>

        {/* Buttons — Get Started (cocoa) / Log In (beige), 56px tall, 28px radius */}
        <FadeIn delay={0.32} className="mt-9 w-full max-w-[325px] lg:max-w-[440px]">
          <div className="flex flex-col gap-5 lg:flex-row lg:gap-4">
            <Link
              href="/signup"
              className="group flex h-14 flex-1 items-center justify-center gap-2 rounded-pill bg-cocoa text-[17px] font-semibold text-white transition-all hover:gap-3 hover:bg-[#7a5234]"
            >
              {t("landing.getStarted")}
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex h-14 flex-1 items-center justify-center rounded-pill bg-beige text-[17px] font-semibold text-ink transition-colors hover:bg-[#e6d8cc]"
            >
              {t("landing.login")}
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.5} className="mt-8 flex items-center gap-4 text-[12px] text-muted">
          <Link href="/legal/privacy" className="hover:text-cocoa">
            {t("landing.privacy")}
          </Link>
          <span className="text-line">·</span>
          <Link href="/legal/terms" className="hover:text-cocoa">
            {t("landing.terms")}
          </Link>
        </FadeIn>
      </div>
    </div>
  );
}
