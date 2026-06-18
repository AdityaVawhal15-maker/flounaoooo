"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";

// Public landing — matches the Figma "intial landing page" frame.
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-cream px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <FadeIn y={16}>
          <Image
            src="/logo.png"
            alt="Radiues"
            width={140}
            height={140}
            priority
            style={{ filter: "drop-shadow(0 6px 14px rgba(61,28,0,0.18))" }}
          />
        </FadeIn>

        {/* Hero — Stop Searching (ink) / Start Deciding (accent), Inter Bold 28 */}
        <FadeIn delay={0.1} className="mt-7">
          <h1 className="flex flex-col gap-2 text-[28px] font-bold leading-[1.2]">
            <span className="text-ink">Stop Searching</span>
            <span className="text-accent">Start Deciding</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-3.5">
          <p className="mx-auto max-w-[330px] text-[15px] leading-[1.5] text-cocoa">
            Radiues is your AI decision engine that finds the single best option
            across food, rides and more all in one place. No switching apps. No
            endless comparisons. Just the smartest choice, instantly.
          </p>
        </FadeIn>

        {/* Buttons — Get Started (cocoa) / Log In (beige), 56px tall, 28px radius */}
        <FadeIn delay={0.32} className="mt-9 w-full max-w-[325px]">
          <div className="flex flex-col gap-5">
            <Link
              href="/signup"
              className="group flex h-14 items-center justify-center gap-2 rounded-pill bg-cocoa text-[17px] font-semibold text-white transition-all hover:gap-3 hover:bg-[#7a5234]"
            >
              Get Started
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex h-14 items-center justify-center rounded-pill bg-beige text-[17px] font-semibold text-ink transition-colors hover:bg-[#e6d8cc]"
            >
              Log In
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
