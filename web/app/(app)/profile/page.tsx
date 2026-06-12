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
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { Card } from "@/components/ui/Card";

const MENU = [
  { href: "/profile/details", label: "Profile details", icon: UserRound },
  { href: "/profile/settings", label: "Settings", icon: Settings },
  { href: "/profile/addresses", label: "Address", icon: MapPin },
  { href: "/profile/help", label: "Help desk", icon: LifeBuoy },
  { href: "/profile/rewards", label: "Rewards and Offers", icon: Gift },
  { href: "/profile/about", label: "About", icon: Info },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
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
        {MENU.map(({ href, label, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-beige/30 ${
              i < MENU.length - 1 ? "border-b border-line/70" : ""
            }`}
          >
            <Icon size={18} className="text-cocoa" />
            <span className="flex-1 text-[14px] font-medium text-ink">{label}</span>
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
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}
