"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import type { Operator, Role } from "@/components/console/useOperator";

// Where each operator role lands after sign-in.
function homeFor(role: Role): string {
  if (role === "developer") return "/console/dev";
  if (role === "super_admin") return "/console/super";
  if (role === "admin") return "/console/admin";
  return "/console/login";
}

export default function ConsoleLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: password → triggers the emailed second factor for operators.
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/console/login", { method: "POST", json: { email, password } });
      setStep("otp");
    } catch (err) {
      // 404 (not an operator) is shown the same as bad credentials — no leak.
      const msg =
        err instanceof ApiClientError && err.status === 404
          ? "This account doesn't have console access."
          : err instanceof ApiClientError
            ? err.message
            : "Sign in failed — try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  // Step 2: the 6-digit code → starts the verified operator session.
  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: Operator }>("/api/auth/console/verify", {
        method: "POST",
        json: { email, code },
      });
      router.replace(homeFor(user.role));
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Verification failed — try again.",
      );
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api("/api/auth/console/login", { method: "POST", json: { email, password } });
    } catch {
      /* keep quiet — the code from the first send is still valid */
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 ring-1 ring-slate-700">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-100">Radiues Console</h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Operator access only. Two-factor required. All actions are audited.
          </p>
        </div>

        {step === "password" ? (
          <form
            onSubmit={submitPassword}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <label className="block">
              <span className="text-[12px] font-medium text-slate-400">Email</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[14px] text-slate-100 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-slate-400">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[14px] text-slate-100 outline-none focus:border-emerald-500"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-rose-950/60 px-3 py-2 text-[13px] text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Continue
            </button>
          </form>
        ) : (
          <form
            onSubmit={submitOtp}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <div className="mb-2 flex items-center gap-2 text-[13px] text-slate-300">
              <KeyRound size={15} className="text-emerald-400" />
              We emailed a 6-digit code to <span className="font-medium">{email}</span>.
            </div>
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="······"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-center text-[20px] tracking-[0.4em] text-slate-100 outline-none focus:border-emerald-500"
            />

            {error && (
              <p className="rounded-lg bg-rose-950/60 px-3 py-2 text-[13px] text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Verify &amp; sign in
            </button>

            <div className="flex items-center justify-between pt-1 text-[12px]">
              <button
                type="button"
                onClick={() => {
                  setStep("password");
                  setCode("");
                  setError(null);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-300"
              >
                <ArrowLeft size={13} /> Back
              </button>
              <button
                type="button"
                onClick={resend}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-[12px] text-slate-600">
          Unauthorized access is prohibited and logged.
        </p>
      </div>
    </div>
  );
}
