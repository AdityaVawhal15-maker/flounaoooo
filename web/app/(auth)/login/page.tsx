"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useAuth, type User } from "@/components/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div className="mt-8">
      <h1 className="text-center text-[30px] font-bold text-ink">Welcome</h1>
      <p className="mt-2 text-center text-[13px] text-cocoa">
        You&apos;ll get smarter responses and can upload files, images, and more.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Link
          href="/forgot"
          className="-mt-2 self-end text-[13px] font-semibold text-accent hover:underline"
        >
          Forgot password?
        </Link>

        {error && <p className="text-[13px] text-danger">{error}</p>}
        {info && <p className="text-[13px] text-cocoa">{info}</p>}

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-7 flex items-center gap-3 text-[12px] text-cocoa/70">
        <span className="h-px flex-1 bg-line" />
        Or continue with
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setInfo("Phone sign-in is coming soon — use email for now.")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-line bg-card text-[14px] font-semibold text-ink transition-colors hover:bg-beige/40"
        >
          <Phone size={16} className="text-cocoa" />
          Continue with phone
        </button>
        <GoogleButton onError={setError} />
      </div>

      <p className="mt-10 text-center text-[13px] text-cocoa">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-bold text-ink hover:text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
