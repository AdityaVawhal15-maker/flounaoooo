"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Compass,
  Target,
  Users,
  Calendar,
  Flame,
  CheckCircle2,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { FlounaLogo } from "@/components/brand/FlounaLogo";
import { AIAvatar } from "@/components/ai/AIAvatar";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useI18n } from "@/components/i18n/I18nContext";
import { CAREER_PATHS, MENTORS, SKILL_PROFILES } from "@/lib/ai/knowledge";
import { cn } from "@/lib/cn";

export default function LandingPage() {
  const { t } = useI18n();
  const [googleError, setGoogleError] = useState("");
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<"pm" | "pd" | "se">("pm");

  const activePath = CAREER_PATHS.find((p) =>
    activeInteractiveTab === "pm"
      ? p.id === "path-pm"
      : activeInteractiveTab === "pd"
      ? p.id === "path-pd"
      : p.id === "path-se"
  ) || CAREER_PATHS[0];

  return (
    <div className="min-h-dvh flex flex-col bg-flouna-ivory selection:bg-flouna-orange-soft selection:text-flouna-maroon">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-6 lg:px-12 backdrop-blur-md bg-flouna-ivory/85 border-b border-flouna-grey-soft/80">
        <Link href="/" className="flex items-center gap-3">
          <FlounaLogo size={36} className="text-flouna-maroon" />
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-bold tracking-tight text-flouna-maroon leading-none">
              FLOUNA
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-flouna-grey-mid">
              by Algorithec
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-flouna-charcoal">
          <Link href="/ai" className="flex items-center gap-1.5 text-flouna-maroon font-semibold hover:text-flouna-orange transition-colors">
            <Sparkles size={15} className="text-flouna-orange" />
            <span>FLOUNA AI</span>
          </Link>
          <Link href="/path" className="hover:text-flouna-maroon transition-colors">
            Find Your Path
          </Link>
          <Link href="/mentors" className="hover:text-flouna-maroon transition-colors">
            Mentor Network
          </Link>
          <Link href="/journey" className="hover:text-flouna-maroon transition-colors">
            30-Day Plan
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-pill px-5 py-2 text-[14px] font-semibold text-flouna-maroon hover:bg-flouna-pure-white transition-all"
          >
            Log In
          </Link>
          <Link
            href="/ai"
            className="rounded-pill bg-flouna-maroon px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-flouna-maroon-dark hover:shadow-md hover:scale-105"
          >
            Start with FLOUNA AI
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-16 lg:py-24 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Column */}
          <FadeIn y={16} className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-flouna-maroon/20 bg-flouna-pure-white px-4 py-1 text-flouna-maroon shadow-sm">
              <AIAvatar size={20} active className="border-none bg-transparent" />
              <span className="text-[12px] font-bold uppercase tracking-wider">
                The Intelligence Behind Your Next Move
              </span>
            </div>

            <h1 className="font-serif text-[42px] sm:text-[58px] lg:text-[68px] font-bold text-flouna-maroon leading-[1.05] tracking-tight text-balance">
              Let&apos;s figure out <br />
              <span className="italic text-flouna-charcoal">what comes next.</span>
            </h1>

            <p className="text-[17px] sm:text-[20px] text-flouna-charcoal/85 max-w-xl leading-relaxed">
              FLOUNA understands your goals, strengths, and ambitions to help you discover the right path, connect with verified mentors, and build an actionable 30-day plan.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
              <Link
                href="/ai"
                className="flex h-13 items-center justify-center gap-2 rounded-pill bg-flouna-maroon px-6 text-[16px] font-semibold text-white shadow-ai-maroon transition-all hover:bg-flouna-maroon-dark hover:scale-105"
              >
                <span>Start with FLOUNA AI</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/path"
                className="flex h-13 items-center justify-center rounded-pill border border-flouna-grey-soft bg-flouna-pure-white px-6 text-[16px] font-semibold text-flouna-maroon shadow-soft transition-all hover:border-flouna-orange hover:bg-flouna-orange-soft/40"
              >
                Explore My Path
              </Link>
            </div>

            <div className="pt-4 flex items-center gap-6 text-[13px] text-flouna-charcoal/70">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-flouna-orange" />
                <span>No generic advice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-flouna-orange" />
                <span>Verified industry mentors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-flouna-orange" />
                <span>Tailored 30-day blueprints</span>
              </div>
            </div>
          </FadeIn>

          {/* Right Floating Intelligent Workspace Preview */}
          <FadeIn delay={0.2} className="lg:col-span-5">
            <div className="relative rounded-[28px] border border-flouna-grey-soft bg-flouna-pure-white p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-flouna-grey-soft/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <AIAvatar size={32} active />
                  <div>
                    <span className="font-serif text-[17px] font-bold text-flouna-maroon block leading-tight">
                      FLOUNA AI Workspace
                    </span>
                    <span className="text-[11px] font-medium text-flouna-orange flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-flouna-orange animate-pulse" />
                      Good evening, Aditya
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-flouna-maroon-soft px-2.5 py-0.5 text-[11px] font-bold uppercase text-flouna-maroon">
                  Live
                </span>
              </div>

              {/* Interactive Path Tabs */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-flouna-grey-mid">
                  What are we building toward?
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: "pm", label: "Product Management" },
                    { id: "pd", label: "Product Design" },
                    { id: "se", label: "Engineering" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveInteractiveTab(id as "pm" | "pd" | "se")}
                      className={cn(
                        "rounded-pill px-3 py-1 text-[12px] font-semibold transition-all",
                        activeInteractiveTab === id
                          ? "bg-flouna-maroon text-white shadow-sm"
                          : "bg-flouna-ivory text-flouna-charcoal hover:bg-flouna-grey-soft/60"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Path Signal Preview Card */}
              <div className="rounded-[18px] border border-flouna-grey-soft bg-flouna-warm-white p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-[18px] font-bold text-flouna-maroon">
                    {activePath.title}
                  </span>
                  <span className="rounded-full bg-flouna-orange-soft px-2.5 py-0.5 text-[12px] font-bold text-flouna-maroon border border-flouna-orange/30">
                    {activePath.fitScore}% Fit
                  </span>
                </div>

                <p className="text-[13px] text-flouna-charcoal/80 leading-relaxed">
                  {activePath.tagline}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-flouna-grey-soft/60 text-[12px]">
                  <p className="font-bold text-flouna-maroon uppercase tracking-wider text-[10px]">
                    Key Signal
                  </p>
                  <p className="text-flouna-charcoal">
                    ✓ {activePath.whyFit[0]}
                  </p>
                </div>
              </div>

              {/* Interactive Direct Trigger */}
              <div className="space-y-2">
                <Link
                  href={`/ai?prompt=Help me evaluate my fit for ${encodeURIComponent(activePath.title)}`}
                  className="flex items-center justify-between rounded-[16px] bg-flouna-ivory p-3.5 border border-flouna-maroon/20 hover:bg-flouna-orange-soft/40 transition-colors group"
                >
                  <span className="text-[13px] font-medium text-flouna-charcoal">
                    &ldquo;Analyze my fit for {activePath.title}&rdquo;
                  </span>
                  <ArrowRight size={16} className="text-flouna-orange group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* The Intelligence Loop Section */}
      <section className="bg-flouna-warm-white py-20 px-6 lg:px-12 border-y border-flouna-grey-soft">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[12px] font-bold uppercase tracking-wider text-flouna-orange">
              The FLOUNA Intelligence Loop
            </span>
            <h2 className="font-serif text-[32px] sm:text-[44px] font-bold text-flouna-maroon leading-tight">
              You don&apos;t need more information. <br />
              <span className="italic text-flouna-charcoal">You need better direction.</span>
            </h2>
            <p className="text-[16px] text-flouna-charcoal/80">
              FLOUNA transforms ambiguity into momentum through a continuous, adaptive intelligence engine.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "DISCOVER",
                desc: "Map your natural problem-solving strengths against verified career trajectories.",
                icon: Compass,
              },
              {
                step: "02",
                title: "RECOMMEND",
                desc: "Identify your Next Lever skill and match high-alignment pathways with confidence.",
                icon: Target,
              },
              {
                step: "03",
                title: "CONNECT",
                desc: "Pair with senior practitioners from Stripe, Linear, and DeepMind for lived calibration.",
                icon: Users,
              },
              {
                step: "04",
                title: "EXECUTE",
                desc: "Progress through an interactive 30-day roadmap with tangible project milestones.",
                icon: Calendar,
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[22px] border border-flouna-grey-soft bg-flouna-pure-white p-6 shadow-sm space-y-4 hover:shadow-md hover:border-flouna-maroon/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] font-bold text-flouna-orange">
                    {item.step}
                  </span>
                  <item.icon size={20} className="text-flouna-maroon" />
                </div>
                <h3 className="font-serif text-[20px] font-bold text-flouna-maroon">
                  {item.title}
                </h3>
                <p className="text-[14px] text-flouna-charcoal/80 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium Maroon Section (Brand Statement) */}
      <section className="bg-flouna-maroon py-20 px-6 lg:px-12 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1 text-[12px] font-bold uppercase tracking-wider text-flouna-orange-bright border border-white/15">
            <Sparkles size={14} className="text-flouna-orange" />
            A New Philosophy of Growth
          </span>

          <h2 className="font-serif text-[36px] sm:text-[52px] lg:text-[62px] font-bold leading-[1.1] text-balance">
            Your career is not a straight line. <br />
            <span className="italic text-flouna-orange-soft">FLOUNA helps you navigate it.</span>
          </h2>

          <p className="text-[17px] sm:text-[19px] text-white/80 max-w-2xl mx-auto leading-relaxed">
            AI understands your trajectory. Human mentors provide the lived context. FLOUNA connects both into one coherent operating system for personal and professional growth.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              href="/ai"
              className="rounded-pill bg-flouna-orange px-7 py-3 text-[15px] font-bold text-white shadow-lg transition-all hover:bg-flouna-orange-bright hover:scale-105"
            >
              Start My Journey with FLOUNA AI
            </Link>
          </div>
        </div>
      </section>

      {/* Auth & Entry Section */}
      <section className="py-20 px-6 lg:px-12 max-w-xl mx-auto w-full text-center space-y-8">
        <div className="space-y-2">
          <FlounaLogo size={56} className="mx-auto text-flouna-maroon" />
          <h3 className="font-serif text-[28px] font-bold text-flouna-maroon">
            Step Into Your Next Chapter
          </h3>
          <p className="text-[15px] text-flouna-charcoal/80">
            Sign in to persist your career telemetry, save learning plans, and book mentor sessions.
          </p>
        </div>

        <div className="space-y-3">
          <GoogleButton onError={setGoogleError} label="Continue with Google" variant="surface" />
          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-pill border border-flouna-grey-soft bg-flouna-pure-white text-[16px] font-semibold text-flouna-maroon shadow-soft transition-colors hover:bg-flouna-ivory"
          >
            {t("landing.loginOrSignup")}
          </Link>
        </div>

        {googleError && (
          <p role="alert" className="text-[13px] text-danger">
            {googleError}
          </p>
        )}

        <Link
          href="/ai"
          className="block text-[14px] font-medium text-flouna-maroon hover:underline"
        >
          Explore without signing in →
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-flouna-grey-soft bg-flouna-pure-white px-6 py-8 text-center text-[13px] text-flouna-charcoal/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} FLOUNA by ALGOrITHEC. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/legal/privacy" className="hover:text-flouna-maroon">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-flouna-maroon">Terms of Service</Link>
            <Link href="/legal/accessibility" className="hover:text-flouna-maroon">Accessibility</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
