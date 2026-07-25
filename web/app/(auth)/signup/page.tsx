"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  UserRound,
  Camera,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

  const eye = (shown: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      aria-label={shown ? "Hide password" : "Show password"}
      className="rounded-full p-1.5 text-cocoa/60 hover:text-cocoa"
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

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
        <h1 className="text-[22px] font-bold text-ink">Create Account</h1>
      </div>

      {/* Avatar with camera badge */}
      <div className="mt-4 flex justify-center">
        <div className="relative">
          <span className="flex size-20 items-center justify-center rounded-full bg-beige">
            <UserRound size={36} className="text-cocoa" />
          </span>
          {/* Decorative until avatar upload exists — a button here looked
              clickable but did nothing when tapped. */}
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-cream bg-accent text-white"
          >
            <Camera size={14} />
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Full Name"
          autoComplete="name"
          placeholder="Enter your full name"
          icon={<User size={17} />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />
        <Input
          label="Mobile Number"
          type="tel"
          autoComplete="tel"
          placeholder="Enter mobile number"
          icon={<Phone size={17} />}
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          icon={<Mail size={17} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Password"
          icon={<Lock size={17} />}
          trailing={eye(showPw, () => setShowPw((v) => !v))}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Confirm"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Confirm"
          icon={<Lock size={17} />}
          trailing={eye(showConfirm, () => setShowConfirm((v) => !v))}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
        <Input
          label="Date of Birth"
          type="text"
          inputMode="numeric"
          placeholder="DD / MM / YYYY"
          icon={<Calendar size={17} />}
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <Button type="submit" disabled={busy} className="mt-3 w-full">
          {busy ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-cocoa">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-ink hover:text-accent">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
