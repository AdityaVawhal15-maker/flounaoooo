"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
        json: { name, email, password },
      });
      sessionStorage.setItem("pendingEmail", email);
      router.push("/verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
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
        <h1 className="text-[20px] font-bold text-ink">Create Account</h1>
      </div>

      <div className="mt-4 flex justify-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-beige">
          <UserRound size={34} className="text-cocoa" />
        </span>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Full Name"
          autoComplete="name"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={busy} className="mt-3 w-full">
          {busy ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-cocoa">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ink hover:text-accent">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
