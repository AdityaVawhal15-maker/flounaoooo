"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { FlounaLogo } from "@/components/brand/FlounaLogo";
import {
  AuthField,
  AuthButton,
  AuthOr,
} from "@/components/auth/AuthField";

// Figma "Create Account Light" (2177:7394): the identifier carried from the
// entry screen shown read-only with an Edit link, then Create Password,
// Re-Enter the Password, Continue, an OR rule and Continue with Google.
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Shown on the field itself, beside the box that has to change, rather than
  // only in the summary line at the foot of the form.
  const mismatch = confirm.length > 0 && password !== confirm;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ready =
    name.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    password === confirm;

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
        json: { name: name.trim(), email: email.trim(), password },
      });
      sessionStorage.setItem("pendingEmail", email.trim());
      // The account exists now; back into the signup form would only fail.
      router.replace("/verify");
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
      className="rounded-full p-1 text-auth-muted transition-colors hover:text-auth-ink"
    >
      {shown ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );

  return (
    <div className="min-h-dvh bg-auth-bg px-5 py-5 [@media(max-width:480px)]:py-2">
      <div className="mx-auto w-full max-w-[420px]">
        <Link
          href="/login"
          aria-label="Back"
          className="flex size-10 items-center justify-center rounded-full bg-auth-well text-auth-ink transition-colors hover:bg-auth-well/80"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center [@media(max-width:480px)]:mt-1">
          {/* Shrinks on short phones so a four-field form still fits without
              scrolling — the mark is the most compressible thing here. */}
          <FlounaLogo
            size={92}
            className="size-[92px] text-auth-ink/80 [@media(max-width:480px)]:size-[48px]"
          />
          <h1 className="mt-7 text-[26px] font-bold text-auth-ink [@media(max-width:480px)]:mt-2 [@media(max-width:480px)]:text-[20px]">
            Log in or sign up
          </h1>
          <p className="mt-3 max-w-[330px] text-[16px] leading-[1.5] text-auth-muted [@media(max-width:480px)]:mt-1 [@media(max-width:480px)]:text-[12px] [@media(max-width:480px)]:leading-[1.3]">
            You&apos;ll get smarter responses and can book rides, order food and
            more.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-9 flex flex-col gap-5 [@media(max-width:480px)]:mt-2 [@media(max-width:480px)]:gap-1">
          <AuthField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            required
          />
          <AuthField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthField
            label="Create Password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
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
            trailing={eye(showConfirm, () => setShowConfirm((v) => !v))}
            error={mismatch ? "Passwords do not match" : undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />

          {error && (
            <p role="alert" className="text-[14px] text-danger">
              {error}
            </p>
          )}

          <AuthButton type="submit" disabled={busy || !ready}>
            {busy ? "Creating account…" : "Continue"}
          </AuthButton>
        </form>

        <div className="mt-7 [@media(max-width:480px)]:mt-3">
          <AuthOr />
        </div>

        <div className="mt-7 [@media(max-width:480px)]:mt-3">
          <GoogleButton onError={setError} label="Continue with Google" />
        </div>

        <p className="mt-7 text-center text-[15px] text-auth-muted [@media(max-width:480px)]:mt-3">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-auth-ink hover:underline">
            Log In
          </Link>
        </p>

        <p className="mt-4 pb-8 text-center text-[15px] [@media(max-width:480px)]:mt-2 [@media(max-width:480px)]:pb-2">
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
