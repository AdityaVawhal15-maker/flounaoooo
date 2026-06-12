"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { SubPage } from "@/components/profile/SubPage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfileDetailsPage() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const d = await api<{ user: User }>("/api/users/me", {
        method: "PATCH",
        json: { name, phone: phone.trim() || null },
      });
      setUser(d.user);
      setMessage("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubPage title="Profile details">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          required
        />
        <Input label="Email" value={user?.email ?? ""} disabled readOnly />
        <Input
          label="Mobile Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile number"
          inputMode="numeric"
        />
        <p className="text-[11px] text-cocoa/80">
          Phone verification by SMS is coming soon — your number is saved for when
          it launches.
        </p>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        {message && <p className="text-[13px] text-success">{message}</p>}
        <Button type="submit" disabled={busy} size="md" className="mt-1">
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </SubPage>
  );
}
