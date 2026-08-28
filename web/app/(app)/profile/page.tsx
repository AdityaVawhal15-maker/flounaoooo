"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  ShieldCheck,
  Bell,
  CreditCard,
  Gift,
  History,
  LifeBuoy,
  MessageCircle,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Star,
  LogOut,
  Pencil,
  ArrowLeft,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthContext";
import { useI18n } from "@/components/i18n/I18nContext";
import { useTheme } from "@/components/theme/ThemeContext";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

// Figma "View Profile" (2195:589): avatar with an edit badge, name, a premium
// pill, a three-column identity strip, then Account and Support lists whose
// rows carry an icon badge, a title and a line of explanatory copy.
//
// The copy below is the design's own. It's deliberately not run through i18n
// yet: these strings don't exist in the dictionaries, and inventing six
// languages' worth of row subtitles here would be guessing. The existing
// translated labels stay on the screens that already use them; this set needs a
// translator pass before it can be localized honestly.
type Row = {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const ACCOUNT: Row[] = [
  {
    href: "/profile/details",
    icon: UserRound,
    title: "Personal Information",
    subtitle: "Manage your personal details",
  },
  {
    href: "/profile/privacy",
    icon: ShieldCheck,
    title: "Privacy & Security",
    subtitle: "Manage privacy and security settings",
  },
  {
    href: "/profile/alerts",
    icon: Bell,
    title: "Notifications",
    subtitle: "Manage your notification preferences",
  },
  {
    href: "/profile/plus",
    icon: CreditCard,
    title: "Payment Methods",
    subtitle: "Manage cards, UPI and wallets",
  },
  {
    href: "/profile/rewards",
    icon: Gift,
    title: "Offers & Rewards",
    subtitle: "View your offers and rewards",
  },
  {
    href: "/history",
    icon: History,
    title: "Ride & Order History",
    subtitle: "View your past rides and orders",
  },
];

const SUPPORT: Row[] = [
  {
    href: "/profile/help",
    icon: LifeBuoy,
    title: "Help Center",
    subtitle: "Get help and support",
  },
  {
    href: "/profile/help",
    icon: MessageCircle,
    title: "Contact Us",
    subtitle: "Reach out to our support team",
  },
];

function RowList({ rows, trailing }: { rows: Row[]; trailing?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-card shadow-soft">
      {rows.map(({ href, icon: Icon, title, subtitle }, i) => (
        <StaggerItem key={`${href}-${title}`}>
          <Link
            href={href}
            className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-acct-bg ${
              i < rows.length - 1 || trailing ? "border-b border-line" : ""
            }`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint">
              <Icon size={18} className="text-acct-accent" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold text-acct-ink">
                {title}
              </span>
              <span className="block truncate text-[12px] text-acct-muted">
                {subtitle}
              </span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-acct-muted" />
          </Link>
        </StaggerItem>
      ))}
      {trailing}
    </div>
  );
}

// Appearance — same row shape as its neighbours, but a toggle rather than a
// chevron-nav link, since flipping it acts immediately instead of going
// anywhere. Figma draws it inline in Account, not tucked a level down in
// Settings (which keeps its own copy — the theme is a per-device choice, so
// having it reachable from two places costs nothing and finding it from
// Account is one tap closer).
function AppearanceRow() {
  const { theme, toggle } = useTheme();
  return (
    <StaggerItem>
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint">
          {theme === "dark" ? (
            <Moon size={18} className="text-acct-accent" />
          ) : (
            <Sun size={18} className="text-acct-accent" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-acct-ink">
            Appearance
          </span>
          <span className="block truncate text-[12px] text-acct-muted">
            Change the colors
          </span>
        </span>
        <button
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="Dark mode"
          onClick={toggle}
          className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
            theme === "dark" ? "bg-acct-accent" : "bg-line"
          }`}
        >
          <span
            className={`block size-5 rounded-full bg-white shadow transition-transform ${
              theme === "dark" ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </StaggerItem>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // The badge used to read "Premium Member" for everyone. That contradicted
  // the bill — Plus waives the convenience fee, so a non-member was told they
  // were premium and then charged for not being one — and it argued against
  // the upgrade it links to.
  const [plusActive, setPlusActive] = useState(false);
  useEffect(() => {
    api<{ active: boolean }>("/api/subscription")
      .then((s) => setPlusActive(Boolean(s.active)))
      .catch(() => setPlusActive(false));
  }, []);

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        {/* Every other profile screen (Settings, Details, Privacy…) shows its
            own back-arrow title on mobile too via SubPage — this one was the
            odd one out, hiding it under lg: and relying on AppShell's
            generic "Flouna" bar instead, which Figma's frame doesn't draw. */}
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-full p-2 text-acct-ink transition-colors hover:bg-acct-ink/5"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[20px] font-extrabold text-acct-ink">View Profile</h1>
        </div>

        <FadeIn y={10}>
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="relative">
              <span className="flex size-[104px] items-center justify-center overflow-hidden rounded-full bg-acct-tint text-[36px] font-bold text-acct-accent">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <Link
                href="/profile/details"
                aria-label="Edit profile"
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-acct-bg bg-acct-accent text-white transition-opacity hover:opacity-90"
              >
                <Pencil size={14} />
              </Link>
            </div>

            <h2 className="mt-4 text-[24px] font-extrabold text-acct-ink">
              {user?.name ?? "Your account"}
            </h2>

            {/* Figma's View Profile frame goes straight from the name to the
                identity strip — no Plus pill here. A subscriber's status
                still needs to live somewhere, so it stays as a plain line
                rather than disappearing outright; everyone else finds the
                upgrade path from the Plus page itself, reached the same way
                as any other Account row. */}
            {plusActive && (
              <p className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-acct-accent">
                <Star size={13} className="fill-acct-accent" />
                Premium Member
              </p>
            )}
          </div>
        </FadeIn>

        {/* Identity strip. Values come from the account, so a user with no phone
            set sees a prompt to add one rather than an empty column. */}
        <FadeIn delay={0.08}>
          <div className="mt-7 grid grid-cols-3 gap-2 rounded-[18px] bg-card px-3 py-4 text-center shadow-soft">
            {[
              { icon: Mail, value: user?.email ?? "—", label: "Email" },
              { icon: Phone, value: user?.phone ?? "Add phone", label: "Phone" },
              { icon: MapPin, value: "Hyderabad, India", label: "Location" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1">
                <Icon size={17} className="text-acct-accent" />
                <span className="w-full truncate text-[12px] font-semibold text-acct-ink">
                  {value}
                </span>
                <span className="text-[11px] text-acct-muted">{label}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        <Stagger delayChildren={0.12} className="mt-7">
          <p className="mb-2 px-1 text-[13px] font-semibold text-acct-muted">
            Account
          </p>
          <RowList rows={ACCOUNT} trailing={<AppearanceRow />} />

          <p className="mb-2 mt-7 px-1 text-[13px] font-semibold text-acct-muted">
            Support
          </p>
          <RowList rows={SUPPORT} />
        </Stagger>

        <FadeIn delay={0.3}>
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-pill bg-danger py-4 text-[16px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <LogOut size={18} /> {t("profile.logout")}
          </button>
        </FadeIn>
      </div>
    </div>
  );
}
