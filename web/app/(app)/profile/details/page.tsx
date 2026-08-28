"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, type User } from "@/components/auth/AuthContext";
import { useI18n } from "@/components/i18n/I18nContext";

// Figma "Personal Information" (2195:756): a read-only list of label/value
// pairs with an Edit Information button beneath.
//
// The frame is a view, not a form — so this is a view, and Edit flips the same
// rows into inputs rather than navigating to a second screen the design doesn't
// draw. Every value is real: Date of Birth was already stored at sign-up but
// never returned by the API, and Gender is a new nullable column, so neither
// row is placeholder text.
const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"];

/** "2002-03-12" -> "12 Mar 2002", the format the design shows. */
function formatDob(iso: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-b border-line px-4 py-3.5 last:border-b-0">
      <p className="text-[12px] text-acct-muted">{label}</p>
      <p
        className={`mt-0.5 text-[15px] font-semibold ${
          value ? "text-acct-ink" : "text-acct-muted"
        }`}
      >
        {value ?? "Not added"}
      </p>
    </div>
  );
}

export default function ProfileDetailsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dob, setDob] = useState(user?.dateOfBirth ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
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
        json: {
          name,
          phone: phone.trim() || null,
          dateOfBirth: dob || null,
          gender: gender || null,
        },
      });
      setUser(d.user);
      setMessage(t("pp.det.saved"));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-[52px] w-full rounded-[12px] border border-line bg-card px-3.5 text-[15px] text-acct-ink outline-none focus:border-acct-accent focus:ring-2 focus:ring-acct-accent/12";
  const label = "text-[12px] text-acct-muted";

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-full p-2 text-acct-ink transition-colors hover:bg-acct-ink/5"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-extrabold text-acct-ink">
            Personal Information
          </h1>
        </div>

        {editing ? (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="rounded-[18px] bg-card p-4 shadow-soft">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Full Name</span>
                  <input
                    className={field}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Email</span>
                  {/* Changing the sign-in address needs re-verification, which
                      this screen can't do — shown, but not editable here. */}
                  <input
                    className={`${field} cursor-not-allowed opacity-60`}
                    value={user?.email ?? ""}
                    disabled
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Phone Number</span>
                  <input
                    className={field}
                    type="tel"
                    inputMode="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Date of Birth</span>
                  <input
                    className={field}
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={label}>Gender</span>
                  <select
                    className={field}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-[14px] text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(user?.name ?? "");
                  setPhone(user?.phone ?? "");
                  setDob(user?.dateOfBirth ?? "");
                  setGender(user?.gender ?? "");
                  setError("");
                }}
                className="h-[52px] flex-1 rounded-pill border border-line bg-card text-[16px] font-bold text-acct-ink transition-colors hover:bg-acct-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-[52px] flex-[2] rounded-pill bg-acct-accent text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="overflow-hidden rounded-[18px] bg-card shadow-soft">
              <Row label="Full Name" value={user?.name ?? null} />
              <Row label="Email" value={user?.email ?? null} />
              <Row label="Phone Number" value={user?.phone ?? null} />
              <Row label="Date of Birth" value={formatDob(user?.dateOfBirth ?? null)} />
              <Row label="Gender" value={user?.gender ?? null} />
              <Row label="Address" value={null} />
            </div>

            {message && (
              <p className="mt-3 text-center text-[14px] text-success">{message}</p>
            )}

            <button
              onClick={() => setEditing(true)}
              className="mt-6 h-[54px] w-full rounded-pill bg-acct-accent text-[16px] font-bold text-white transition-opacity hover:opacity-90"
            >
              Edit Information
            </button>

            {/* Address lives in the saved-addresses book, which has its own
                screen — linked rather than duplicated here. */}
            <Link
              href="/profile/addresses"
              className="mt-3 flex h-[54px] w-full items-center justify-center rounded-pill border border-line bg-card text-[16px] font-bold text-acct-ink transition-colors hover:bg-acct-bg"
            >
              Manage addresses
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
