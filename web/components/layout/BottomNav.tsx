"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Car, Pizza, User } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/rides", label: "Rides", icon: Car },
  { href: "/food", label: "Food", icon: Pizza },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active ? "text-accent" : "text-cocoa/70 hover:text-cocoa",
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
