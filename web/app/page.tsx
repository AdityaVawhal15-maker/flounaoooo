import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Public landing — Figma "intial landing page" (1450:562), centered column on desktop.
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-cream px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Radiues logo"
          width={200}
          height={200}
          priority
          style={{ filter: "drop-shadow(0 4px 10px rgba(240,101,0,0.25))" }}
        />

        <h1 className="mt-10 text-[28px] font-bold leading-[1.2]">
          <span className="block text-ink">Stop Searching</span>
          <span className="block text-accent">Start Deciding</span>
        </h1>

        <p className="mt-4 text-[15px] leading-[1.5] text-cocoa">
          Radiues is your AI decision engine that finds the single best option
          across food, rides and more all in one place.
        </p>
        <p className="mt-3 text-[15px] leading-[1.5] text-cocoa">
          No switching apps. No endless comparisons. Just the smartest choice,
          instantly.
        </p>

        <div className="mt-10 flex w-full max-w-[325px] flex-col gap-5">
          <Link
            href="/signup"
            className="flex h-14 items-center justify-center gap-2 rounded-pill bg-cocoa text-[17px] font-semibold text-white transition-colors hover:bg-[#7a5234]"
          >
            Get Started
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="flex h-14 items-center justify-center rounded-pill bg-beige text-[17px] font-semibold text-ink transition-colors hover:bg-[#e6d8cc]"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
