"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { AccountSetup } from "@/components/auth/AccountSetup";

const RESEND_SECONDS = 50;

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

  async function verify() {
    const code = digits.join("");
    if (code.length !== 6 || !email) return;
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
  }

  async function resend() {
    if (secondsLeft > 0 || !email) return;
    setError("");
    try {
      await api("/api/auth/resend-otp", { method: "POST", json: { email } });
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    }
  }

  if (settingUp) {
    return <AccountSetup onDone={() => router.push("/home")} />;
  }

  return (
    <div className="mt-10">
      <h1 className="text-[26px] font-bold text-ink">Verify Email</h1>
      <p className="mt-3 text-[14px] text-cocoa">
        We have sent a 6-digit code to{" "}
        <span className="font-semibold text-ink">{email ?? "…"}</span>
      </p>
      <Link href="/signup" className="mt-1 inline-block text-[13px] font-semibold text-accent">
        Change email address
      </Link>

      <div className="mt-8 flex justify-between gap-2" onPaste={onPaste}>
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
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className="h-14 w-12 rounded-[12px] border border-line bg-card text-center text-[20px] font-semibold text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        ))}
      </div>

      <p className="mt-5 text-center text-[13px] text-cocoa">
        {secondsLeft > 0 ? (
          <>
            Resend OTP in{" "}
            <span className="font-bold text-ink">
              00:{String(secondsLeft).padStart(2, "0")}
            </span>
          </>
        ) : (
          <button onClick={resend} className="font-semibold text-accent hover:underline">
            Resend OTP
          </button>
        )}
      </p>

      {error && <p className="mt-3 text-center text-[13px] text-danger">{error}</p>}

      <Button
        onClick={verify}
        disabled={busy || digits.join("").length !== 6}
        className="mt-8 w-full"
      >
        {busy ? "Verifying…" : "Verify & Login"}
      </Button>
    </div>
  );
}
