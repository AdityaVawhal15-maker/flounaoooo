"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Shell for the account sub-screens (notifications, rewards, help, addresses,
// settings, Plus, about).
//
// On the account palette rather than the app's brand tokens, matching the
// screens the profile rows lead into (Figma 2195:*). Restyled here rather than
// on each page so all seven move together — and so they can move back together
// if the palette question is ever settled the other way.
//
// The header is left-aligned like the rest of the account set, not centred:
// every one of these is reached from a list, so the back control and the title
// belong on the same line the eye is already tracking.
export function SubPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center gap-3 py-5">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="rounded-full p-2 text-acct-ink transition-colors hover:bg-black/5"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-[18px] font-extrabold text-acct-ink lg:text-[22px]">
            {title}
          </h1>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
