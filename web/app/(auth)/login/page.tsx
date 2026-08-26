"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, ChevronDown, Lock, Eye, EyeOff } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { FlounaLogo } from "@/components/brand/FlounaLogo";
import {
  AuthField,
  AuthButton,
  AuthAltButton,
  AuthOr,
} from "@/components/auth/AuthField";

// Figma "Log in or sign up" (2177:7108 email / 2177:7168 phone). One screen in
// two modes, each offering to continue with the other.
//
// The password step is the one thing the frames don't draw: they stop at
// "Continue". Accounts here are password-backed, so the field is revealed in
// place after Continue rather than on a screen of its own — same surface, same
// treatment, no invented navigation.
const COUNTRIES = [
  { label: "India (+91)", dial: "+91" },
  { label: "United States (+1)", dial: "+1" },
  { label: "United Kingdom (+44)", dial: "+44" },
  { label: "United Arab Emirates (+971)", dial: "+971" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [dial, setDial] = useState(COUNTRIES[0].dial);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = phone.replace(/\D/g, "").length >= 7;

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!askPassword) {
      setAskPassword(true);
      return;
    }
    setBusy(true);
    try {
      const d = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        json: { email: email.trim(), password },
      });
      setUser(d.user);
      router.push("/home");
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        // Account exists but email unverified — backend has re-sent a code.
        sessionStorage.setItem("pendingEmail", email.trim());
        router.push("/verify");
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await api("/api/auth/phone/send-otp", {
        method: "POST",
        json: { phone: `${dial}${phone.replace(/\D/g, "")}` },
      });
      sessionStorage.setItem("pendingPhone", `${dial}${phone.replace(/\D/g, "")}`);
      router.push("/verify");
    } catch (err) {
      // The backend returns 501 until an SMS provider is contracted. Say so
      // plainly and point at the path that does work, rather than failing mute.
      setError(
        err instanceof ApiClientError && err.status === 501
          ? "Phone sign-in isn't available yet — continue with email or Google."
          : err instanceof Error
            ? err.message
            : "Could not send the code",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-auth-bg px-5 py-5">
      <div className="mx-auto w-full max-w-[420px]">
        <Link
          href="/"
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full bg-auth-well text-auth-ink transition-colors hover:bg-auth-well/80"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <FlounaLogo size={92} strokeWidth={5} className="text-auth-ink/80" />
          <h1 className="mt-7 text-[26px] font-bold text-auth-ink">
            Log in or sign up
          </h1>
          <p className="mt-3 max-w-[330px] text-[16px] leading-[1.5] text-auth-muted">
            You&apos;ll get smarter responses and can book rides, order food and
            more.
          </p>
        </div>

        {mode === "email" ? (
          <form onSubmit={onEmailSubmit} className="mt-9 flex flex-col gap-4">
            <AuthField
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAskPassword(false);
              }}
              required
            />
            {askPassword && (
              <AuthField
                label="Password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                icon={<Lock size={18} />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="rounded-full p-1 text-auth-muted transition-colors hover:text-auth-ink"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
            {error && (
              <p role="alert" className="text-[14px] text-danger">
                {error}
              </p>
            )}
            <AuthButton
              type="submit"
              disabled={busy || !emailValid || (askPassword && !password)}
            >
              {busy ? "Signing in…" : askPassword ? "Log In" : "Continue"}
            </AuthButton>
            {askPassword && (
              <Link
                href="/forgot"
                className="-mt-1 self-center text-[15px] font-semibold text-auth-ink hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </form>
        ) : (
          <form onSubmit={onPhoneSubmit} className="mt-9 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="country"
                className="text-[13px] font-medium text-auth-ink"
              >
                Country/Region
              </label>
              <div className="relative">
                <select
                  id="country"
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  className="h-[60px] w-full appearance-none rounded-[16px] bg-auth-well px-4 pr-11 text-[17px] text-auth-ink outline-none focus:ring-2 focus:ring-white/25"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.dial} value={c.dial}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={20}
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-auth-muted"
                />
              </div>
            </div>
            <AuthField
              label="Phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            {error && (
              <p role="alert" className="text-[14px] text-danger">
                {error}
              </p>
            )}
            <AuthButton type="submit" disabled={busy || !phoneValid}>
              {busy ? "Sending…" : "Send Verification code"}
            </AuthButton>
          </form>
        )}

        {info && <p className="mt-3 text-center text-[14px] text-auth-muted">{info}</p>}

        <div className="mt-7">
          <AuthOr />
        </div>

        <div className="mt-7 flex flex-col gap-4">
          <GoogleButton onError={setError} label="Continue with Google" />
          <AuthAltButton
            type="button"
            onClick={() => {
              setMode(mode === "email" ? "phone" : "email");
              setError("");
              setAskPassword(false);
            }}
          >
            {mode === "email" ? (
              <>
                <Phone size={20} /> Continue with phone
              </>
            ) : (
              <>
                <Mail size={20} /> Continue with email
              </>
            )}
          </AuthAltButton>
        </div>

        <p className="mt-7 text-center text-[15px] text-auth-muted">
          New here?{" "}
          <Link href="/signup" className="font-bold text-auth-ink hover:underline">
            Create an account
          </Link>
        </p>

        <p className="mt-4 pb-8 text-center text-[15px]">
          <Link href="/legal/terms" className="font-medium text-auth-ink hover:underline">
            Terms of Use
          </Link>
          <span className="px-2 text-auth-muted">·</span>
          <Link href="/legal/privacy" className="font-medium text-auth-ink hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
