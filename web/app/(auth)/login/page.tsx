"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Fingerprint,
  Apple,
} from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { AuthField } from "@/components/auth/AuthField";

// Figma "Login Screen" (node 2086:269). The composition is a centred column on
// cream: back button + wordmark, a badge, a two-tone headline, then the form
// lifted onto a white card so it reads as the one thing to act on. Desktop
// keeps the same column rather than stretching the card — a 1200px-wide login
// form looks broken, and the design is a single centred stack at every width.
export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      setUser(d.user);
      router.push("/home");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        // Account exists but email unverified — backend has re-sent a code.
        sessionStorage.setItem("pendingEmail", email);
        router.push("/verify");
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-cream px-5 py-5">
      <div className="mx-auto w-full max-w-[440px]">
        {/* Back + wordmark */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full bg-beige text-ink transition-colors hover:bg-[#e6d8cc]"
          >
            <ArrowLeft size={20} />
          </Link>
          <span className="text-[20px] font-bold text-ink">Flouna</span>
        </div>

        {/* Badge + two-tone headline */}
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-4 py-2 text-[14px] font-semibold text-accent">
            <Sparkles size={15} />
            Welcome Back
          </span>
          <h1 className="mt-4 text-[30px] font-bold leading-[1.25]">
            <span className="block text-ink">Log In to</span>
            <span className="block text-accent">Your Account</span>
          </h1>
          <p className="mt-2 text-[15px] text-cocoa">
            Your smartest decisions are waiting for you.
          </p>
        </div>

        {/* Form card */}
        <div className="mt-7 rounded-[24px] bg-card p-6 shadow-card">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <AuthField
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="hello@example.com"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AuthField
              label="Password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              icon={<Lock size={18} />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="rounded-full p-1 text-cocoa/60 transition-colors hover:text-cocoa"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Link
              href="/forgot"
              className="-mt-1 self-end text-[14px] font-bold text-accent hover:underline"
            >
              Forgot password?
            </Link>

            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}
            {info && <p className="text-[13px] text-cocoa">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="group flex h-[60px] w-full items-center justify-center gap-2.5 rounded-pill bg-cocoa text-[17px] font-bold text-white transition-all hover:bg-[#7a5234] disabled:opacity-60"
            >
              {busy ? "Logging in…" : "Log In"}
              {!busy && (
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[14px] text-cocoa/70">
            <span className="h-px flex-1 bg-line" />
            or continue with
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <GoogleButton onError={setError} />
            <button
              type="button"
              onClick={() =>
                setInfo("Apple sign-in is coming soon — use email for now.")
              }
              className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[16px] bg-ink text-[15px] font-bold text-white transition-opacity hover:opacity-90"
            >
              <Apple size={19} className="fill-white" />
              Apple
            </button>
          </div>
        </div>

        {/* Biometric — the design offers it as a separate path below the card.
            Kept visible but honest: there's no passkey backend yet, so it says
            so rather than failing silently on tap. */}
        <div className="mt-6 flex items-center gap-3 text-[14px] text-cocoa/60">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={() =>
            setInfo("Face ID / fingerprint sign-in is coming soon.")
          }
          className="mx-auto mt-5 flex h-[52px] items-center justify-center gap-2.5 rounded-pill border border-accent/25 bg-accent-soft/40 px-7 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-soft"
        >
          <Fingerprint size={19} className="text-accent" />
          Use Face ID / Fingerprint
        </button>

        <p className="mt-7 text-center text-[15px] text-ink">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-accent hover:underline">
            Sign Up
          </Link>
        </p>

        <p className="mt-4 pb-6 text-center text-[13px] leading-relaxed text-cocoa/70">
          By continuing, you agree to our
          <br />
          <Link href="/legal/terms" className="font-bold text-ink hover:text-accent">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="font-bold text-ink hover:text-accent">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
