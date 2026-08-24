"use client";

import { usePathname } from "next/navigation";
import { SlideIn, MOTION } from "@/components/ui/motion";

// The account section is the most heavily animated part of the prototype — 62
// of its transitions are MOVE_IN 150ms LEFT, i.e. each sub-screen travels left
// into place as you drill in from the profile list.
//
// A layout does not remount when you navigate between its own routes, so the
// pathname is the key: without it the transition would play once and never
// again for the rest of the section.
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SlideIn key={pathname} direction="left" duration={MOTION.quick}>
      {children}
    </SlideIn>
  );
}
