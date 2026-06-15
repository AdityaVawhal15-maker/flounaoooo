"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pizza, Car, ShoppingBag } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { CategoryTile } from "@/components/ui/CategoryTile";

// Public landing — premium, minimal, with a soft ambient backdrop.
export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-cream px-6 py-12">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full opacity-60 blur-[100px]"
        style={{ background: "radial-gradient(circle, #ffd9bf 0%, transparent 70%)" }}
      />

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <FadeIn y={16}>
          <Image
            src="/logo.png"
            alt="Radiues"
            width={104}
            height={104}
            priority
            style={{ filter: "drop-shadow(0 8px 24px rgba(240,101,0,0.28))" }}
          />
        </FadeIn>

        <FadeIn delay={0.1} className="mt-9">
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight text-ink">
            Stop searching.
            <br />
            <span className="italic text-accent">Start deciding.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2} className="mt-5">
          <p className="mx-auto max-w-[300px] text-[15px] leading-relaxed text-cocoa">
            Your AI decision engine — the single best option across food, rides
            and shopping, instantly.
          </p>
        </FadeIn>

        {/* Domain hints */}
        <FadeIn delay={0.3} className="mt-8 flex items-center gap-5">
          {[
            { icon: Pizza, theme: "orange" as const, label: "Food" },
            { icon: Car, theme: "blue" as const, label: "Rides" },
            { icon: ShoppingBag, theme: "purple" as const, label: "Shop" },
          ].map((d) => (
            <div key={d.label} className="flex flex-col items-center gap-1.5">
              <CategoryTile icon={d.icon} theme={d.theme} size={52} />
              <span className="text-[11px] font-medium text-muted">{d.label}</span>
            </div>
          ))}
        </FadeIn>

        <FadeIn delay={0.42} className="mt-11 w-full max-w-[320px]">
          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="group flex h-14 items-center justify-center gap-2 rounded-pill bg-ink text-[16px] font-semibold text-white shadow-lift transition-all hover:gap-3 hover:bg-[#2c1500]"
            >
              Get Started
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex h-14 items-center justify-center rounded-pill border border-line bg-card text-[16px] font-semibold text-ink transition-colors hover:bg-beige/40"
            >
              Log In
            </Link>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
