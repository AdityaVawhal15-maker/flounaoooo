"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      const { user } = await api<{ user: Operator }>("/api/auth/me");
      if (user.role === "user") {
        // A valid account, but not an operator — don't reveal the surface.
        setError("This account doesn't have console access.");
        setBusy(false);
        return;
      }
      router.replace(homeFor(user.role));
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Sign in failed — try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-slate-800 text-emerald-400 ring-1 ring-slate-700">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-slate-100">
            Radiues Console
          </h1>
          <p className="mt-1 text-[13px] text-slate-400">
            Operator access only. All actions are audited.
          </p>
        </div>

        <form
          onSubmit={submit}
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
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-slate-600">
          Unauthorized access is prohibited and logged.
        </p>
      </div>
    </div>
  );
}
