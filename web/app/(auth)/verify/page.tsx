"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { AccountSetup } from "@/components/auth/AccountSetup";
import { FlounaLogo } from "@/components/brand/FlounaLogo";

const RESEND_SECONDS = 50;

// Figma "OTP Verify" (node 2177:7484): back button, lotus, headline, six boxes,
// and a resend countdown. The design shows no submit button, which is the
// standard OTP pattern — the code submits itself once the sixth digit lands. A
// visible button is kept as well, because after a wrong code the user needs an
// obvious way to retry, and auto-submit alone leaves nothing to press.
//
// The design also reuses the signup headline here and never shows the address
// the code went to. That's kept as a verify-specific headline instead: without
// the address on screen, anyone who mistyped their email has no way to tell why
// the code never arrived.
export default function VerifyEmailPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  // Remembers which code already went to the server, so a rejected code doesn't
  // auto-resubmit in a loop while the six boxes are still full.
  const attempted = useRef<string>("");

  useEffect(() => {
    // Deferred a tick: sessionStorage is an external store, and the state
    // update must happen in a callback rather than the effect body.
    const t = setTimeout(() => {
      const pending = sessionStorage.getItem("pendingEmail");
      if (!pending) router.replace("/signup");
      else setEmail(pending);
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const verify = useCallback(async () => {
    const code = digits.join("");
    if (code.length !== 6 || !email || busy) return;
    attempted.current = code;
    setError("");
    setBusy(true);
    try {
      const d = await api<{ user: User }>("/api/auth/verify-email", {
        method: "POST",
        json: { email, code },
      });
      sessionStorage.removeItem("pendingEmail");
      setUser(d.user);
      setSettingUp(true); // themed transition handles the redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setBusy(false);
    }
  }, [digits, email, busy, setUser]);

  // Auto-submit once the code is complete and hasn't already been tried.
  useEffect(() => {
    const code = digits.join("");
    if (code.length === 6 && code !== attempted.current && email && !busy) {
      void verify();
    }
  }, [digits, email, busy, verify]);

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setDigits(text.split(""));
      inputs.current[5]?.focus();
    }
  }

  async function resend() {
    if (secondsLeft > 0 || !email) return;
    setError("");
    try {
      await api("/api/auth/resend-otp", { method: "POST", json: { email } });
      setSecondsLeft(RESEND_SECONDS);
      // A fresh code invalidates the old one — clear the boxes so the stale
      // digits can't auto-submit against it.
      setDigits(Array(6).fill(""));
      attempted.current = "";
      inputs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    }
  }

  if (settingUp) {
    return <AccountSetup onDone={() => router.push("/home")} />;
  }

  const complete = digits.join("").length === 6;

  return (
    <div className="min-h-dvh bg-cream px-5 py-5">
      <div className="mx-auto w-full max-w-[440px]">
        <Link
          href="/signup"
          aria-label="Back"
          className="flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-soft transition-colors hover:bg-beige"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <FlounaLogo size={84} strokeWidth={5} className="text-ink" />
          <h1 className="mt-5 text-[26px] font-bold text-ink">
            Verify your email
          </h1>
          <p className="mt-2 text-[15px] leading-[1.5] text-cocoa">
            We sent a 6-digit code to
            <br />
            <span className="font-semibold text-ink">{email ?? "…"}</span>
          </p>
          <Link
            href="/signup"
            className="mt-2 text-[14px] font-semibold text-accent hover:underline"
          >
            Change email address
          </Link>
        </div>

        <div className="mt-9 flex justify-center gap-2.5" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1}`}
              value={d}
              disabled={busy}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="h-[62px] w-[52px] rounded-[16px] border border-line bg-card text-center text-[22px] font-bold text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            />
          ))}
        </div>

        <p className="mt-6 text-center text-[15px] text-cocoa">
          Didn&apos;t receive code?{" "}
          {secondsLeft > 0 ? (
            <span className="font-bold text-accent">
              Resend in 00:{String(secondsLeft).padStart(2, "0")}
            </span>
          ) : (
            <button
              onClick={resend}
              className="font-bold text-accent hover:underline"
            >
              Resend now
            </button>
          )}
        </p>

        {error && (
          <p role="alert" className="mt-4 text-center text-[14px] text-danger">
            {error}
          </p>
        )}

        <button
          onClick={verify}
          disabled={busy || !complete}
          className="mt-8 h-[60px] w-full rounded-pill bg-accent text-[17px] font-bold text-white transition-colors hover:bg-[#d4570f] disabled:opacity-50"
        >
          {busy ? "Verifying…" : "Verify & Continue"}
        </button>
      </div>
    </div>
  );
}
