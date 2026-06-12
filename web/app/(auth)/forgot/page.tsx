"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/forgot", { method: "POST", json: { email } });
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/reset", {
        method: "POST",
        json: { email, code, password },
      });
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="relative flex items-center justify-center py-3">
        <Link
          href="/login"
          aria-label="Back to login"
          className="absolute left-0 rounded-full p-2 text-ink hover:bg-beige"
        >
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-[20px] font-bold text-ink">Reset password</h1>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-6 flex flex-col gap-4">
          <p className="text-[13px] text-cocoa">
            Enter your account email and we&apos;ll send a 6-digit code to reset
            your password.
          </p>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <Button type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-6 flex flex-col gap-4">
          <p className="text-[13px] text-cocoa">
            We sent a code to <span className="font-semibold text-ink">{email}</span>.
            Enter it below with your new password.
          </p>
          <Input
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <Button type="submit" disabled={busy || code.length !== 6} className="mt-2 w-full">
            {busy ? "Resetting…" : "Reset password"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-[13px] font-semibold text-accent hover:underline"
          >
            Didn&apos;t get it? Send again
          </button>
        </form>
      )}
    </div>
  );
}
