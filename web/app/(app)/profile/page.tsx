"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Settings,
  MapPin,
  LifeBuoy,
  Gift,
  Info,
  LogOut,
  ChevronRight,
  Bell,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useI18n } from "@/components/i18n/I18nContext";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";

const MENU: { href: string; key: TranslationKey; icon: typeof UserRound }[] = [
  { href: "/profile/details", key: "profile.details", icon: UserRound },
  { href: "/profile/settings", key: "profile.settings", icon: Settings },
  { href: "/profile/alerts", key: "profile.alerts", icon: Bell },
  { href: "/profile/addresses", key: "profile.address", icon: MapPin },
  { href: "/profile/help", key: "profile.help", icon: LifeBuoy },
  { href: "/profile/rewards", key: "profile.rewards", icon: Gift },
  { href: "/profile/about", key: "profile.about", icon: Info },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-beige text-[22px] font-bold text-cocoa">
          {user?.name?.[0]?.toUpperCase() ?? "U"}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold text-ink">{user?.name}</h1>
          <p className="truncate text-[13px] text-cocoa">{user?.email}</p>
        </div>
      </div>

      <Card className="mt-6 p-0">
        {MENU.map(({ href, key, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-beige/30 ${
              i < MENU.length - 1 ? "border-b border-line/70" : ""
            }`}
          >
            <Icon size={18} className="text-cocoa" />
            <span className="flex-1 text-[14px] font-medium text-ink">{t(key)}</span>
            <ChevronRight size={16} className="text-cocoa/50" />
          </Link>
        ))}
      </Card>

      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-pill border border-danger/30 bg-card py-3 text-[14px] font-semibold text-danger transition-colors hover:bg-danger/5"
      >
        <LogOut size={16} /> {t("profile.logout")}
      </button>
    </div>
  );
}
