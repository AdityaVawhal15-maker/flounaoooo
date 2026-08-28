"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

// Figma "Privacy & Security" (2195:852). Eight controls across two sections.
//
// Three of them are real. Share My Location is a stored preference that
// genuinely gates the rides screen auto-reading the rider's position. Change
// Password runs the existing email-code reset. Login Activity reads the refresh
// tokens that already represent sessions, and signing out other devices really
// revokes them.
//
// The other five — profile visibility, activity status, blocked users,
// biometric lock, two-factor — need features this product doesn't have: there
// is no social graph, no WebAuthn, no user-facing 2FA. They are drawn as the
// design shows, but as plainly unavailable rather than as switches that move
// and change nothing. A toggle that silently does nothing is worse than an
// honest one that's off, especially on a screen about security.
type Prefs = { shareLocation: boolean };

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors",
        checked ? "bg-acct-accent" : "bg-black/15",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-6 rounded-full bg-white shadow transition-[left]",
          checked ? "left-[25px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

function Row({
  title,
  subtitle,
  value,
  children,
  href,
  onClick,
}: {
  title: string;
  subtitle: string;
  value?: string;
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[14px] font-semibold text-acct-ink">
            {title}
          </span>
          {value && (
            <span className="shrink-0 text-[13px] font-medium text-acct-muted">
              {value}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-acct-muted">
          {subtitle}
        </span>
      </span>
      {children ?? <ChevronRight size={17} className="shrink-0 text-acct-muted" />}
    </>
  );

  const cls =
    "flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0";

  if (href) {
    return (
      <Link href={href} className={cn(cls, "transition-colors hover:bg-acct-bg")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={cn(cls, "transition-colors hover:bg-acct-bg")}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

function Unavailable() {
  return (
    <span className="shrink-0 rounded-pill bg-black/5 px-2.5 py-1 text-[11px] font-semibold text-acct-muted">
      Not available yet
    </span>
  );
}

export default function PrivacySecurityPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [sessions, setSessions] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api<Prefs>("/api/users/preferences")
      .then((p) => setPrefs({ shareLocation: p.shareLocation }))
      .catch(() => setPrefs({ shareLocation: true }));
    api<{ count: number }>("/api/users/sessions")
      .then((d) => setSessions(d.count))
      .catch(() => setSessions(null));
  }, []);

  async function setShareLocation(v: boolean) {
    setPrefs((p) => (p ? { ...p, shareLocation: v } : p));
    try {
      await api("/api/users/preferences", {
        method: "PUT",
        json: { shareLocation: v },
      });
    } catch {
      // Put the switch back where it was — leaving it flipped would claim a
      // setting that never saved.
      setPrefs((p) => (p ? { ...p, shareLocation: !v } : p));
      toast("Could not save that setting");
    }
  }

  async function revokeOthers() {
    setBusy(true);
    try {
      const d = await api<{ revoked: number }>("/api/auth/sessions/revoke-others", {
        method: "POST",
      });
      setSessions(1);
      toast(
        d.revoked > 0
          ? `Signed out ${d.revoked} other session${d.revoked > 1 ? "s" : ""}`
          : "No other sessions were active",
      );
    } catch {
      toast("Could not sign out other devices");
    } finally {
      setBusy(false);
    }
  }

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
            Privacy &amp; Security
          </h1>
        </div>

        <p className="mb-2 px-1 text-[13px] font-semibold text-acct-muted">Privacy</p>
        <div className="overflow-hidden rounded-[18px] bg-card shadow-soft">
          <Row
            title="Share My Location"
            subtitle="Let Flouna detect your pickup automatically"
          >
            <Toggle
              label="Share my location"
              checked={prefs?.shareLocation ?? true}
              onChange={setShareLocation}
              disabled={!prefs}
            />
          </Row>
          <Row title="Profile Visibility" value="Everyone" subtitle="Who can see your profile">
            <Unavailable />
          </Row>
          <Row title="Activity Status" subtitle="Show your activity status">
            <Unavailable />
          </Row>
          <Row title="Blocked Users" subtitle="Manage blocked users">
            <Unavailable />
          </Row>
        </div>

        <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-acct-muted">
          Security
        </p>
        <div className="overflow-hidden rounded-[18px] bg-card shadow-soft">
          <Row
            title="Change Password"
            subtitle="We'll email you a code to set a new one"
            href="/forgot"
          />
          <Row title="Biometric Lock" subtitle="Use fingerprint or face ID">
            <Unavailable />
          </Row>
          <Row title="Two-Factor Authentication" value="Off" subtitle="Add extra security">
            <Unavailable />
          </Row>
          <Row
            title="Login Activity"
            value={
              sessions === null
                ? undefined
                : `${sessions} active session${sessions === 1 ? "" : "s"}`
            }
            subtitle={
              busy ? "Signing out other devices…" : "Sign out everywhere except here"
            }
            onClick={busy ? undefined : revokeOthers}
          />
        </div>

        <p className="mt-5 px-1 text-[12px] leading-relaxed text-acct-muted">
          Controls marked <span className="font-semibold">Not available yet</span>{" "}
          need features Flouna doesn&apos;t have — there are no public profiles to
          hide, and no passkey or two-factor support to switch on. They&apos;ll turn
          on here when they exist.
        </p>
      </div>
    </div>
  );
}
