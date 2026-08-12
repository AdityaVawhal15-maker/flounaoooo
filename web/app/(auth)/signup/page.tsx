"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, Lock, Eye, EyeOff, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthField } from "@/components/auth/AuthField";
import { FlounaLogo } from "@/components/brand/FlounaLogo";

// Figma "Create Account" (node 2177:7394): back button, centred lotus, headline
// + subtitle, stacked fields, a full-width accent Continue, then Google below an
// OR rule.
//
// One deliberate divergence: the design makes a phone number the primary
// identifier, but phone OTP needs an SMS provider that isn't contracted yet, so
// a phone-only signup would dead-end at the verify step. Email stays the
// identifier that actually completes; phone is kept as an optional field so the
// number is still captured for when SMS lands.
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Surfaced on the field itself rather than only in the summary line, so the
  // mismatch is visible next to the box the user has to fix.
  const mismatch = confirm.length > 0 && password !== confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        json: {
          name,
          email,
          password,
          // Optional, but the form asks for them — so they must be saved,
          // not silently discarded.
          ...(mobile.trim() ? { phone: mobile.trim() } : {}),
          ...(dob ? { dateOfBirth: dob } : {}),
        },
      });
      sessionStorage.setItem("pendingEmail", email);
      router.push("/verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  const eye = (shown: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="rounded-full p-1 text-cocoa/60 transition-colors hover:text-cocoa"
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <div className="min-h-dvh bg-cream px-5 py-5">
      <div className="mx-auto w-full max-w-[440px]">
        <Link
          href="/login"
          aria-label="Back to login"
          className="flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-soft transition-colors hover:bg-beige"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <FlounaLogo size={84} strokeWidth={5} className="text-ink" />
          <h1 className="mt-5 text-[26px] font-bold text-ink">
            Log in or sign up
          </h1>
          <p className="mt-2 max-w-[320px] text-[15px] leading-[1.5] text-cocoa">
            You&apos;ll get smarter responses and can book rides, order food and
            more.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
          <AuthField
            label="Full Name"
            autoComplete="name"
            placeholder="Enter your full name"
            icon={<User size={18} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
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
            label="Phone number"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 90000 00000"
            icon={<Phone size={18} />}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <AuthField
            label="Create Password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            icon={<Lock size={18} />}
            trailing={eye(showPw, () => setShowPw((v) => !v))}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <AuthField
            label="Re-Enter the Password"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat your password"
            icon={<Lock size={18} />}
            trailing={eye(showConfirm, () => setShowConfirm((v) => !v))}
            error={mismatch ? "Passwords do not match" : undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          <AuthField
            label="Date of Birth"
            type="date"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
            icon={<Calendar size={18} />}
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-[60px] w-full rounded-pill bg-accent text-[17px] font-bold text-white transition-colors hover:bg-[#d4570f] disabled:opacity-60"
          >
            {busy ? "Creating account…" : "Continue"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3 text-[13px] font-semibold text-cocoa/60">
          <span className="h-px flex-1 bg-line" />
          OR
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-6">
          <GoogleButton onError={setError} label="Continue with Google" />
        </div>

        <p className="mt-7 text-center text-[15px] text-ink">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-accent hover:underline">
            Log In
          </Link>
        </p>

        <p className="mt-4 pb-6 text-center text-[13px] text-cocoa/70">
          <Link href="/legal/terms" className="font-semibold text-accent hover:underline">
            Terms of Use
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="font-semibold text-accent hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
