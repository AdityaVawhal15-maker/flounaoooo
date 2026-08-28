"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The empty / error / unavailable screen from the Figma "Screen Unauthorized"
// set (2539:2977 and 2551:31xx–34xx). Nine screens share one layout, so this is
// one component rather than nine: illustration, title, a line of explanation,
// then a primary action and a way out.
//
// Spec read from the frame rather than eyeballed — ground #fdf7f2, title 22/700
// #2d1a0e, body 14/400 #9a7060, buttons 52px tall at radius 59, primary #b84a22.
// Those live as tokens in globals.css so the palette stays swappable.

export type StateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function StateScreen({
  illustration,
  title,
  message,
  primary,
  secondary,
  className,
}: {
  illustration?: ReactNode;
  title: string;
  message: string;
  primary?: StateAction;
  secondary?: StateAction;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60dvh] w-full flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      {illustration && <div className="mb-7">{illustration}</div>}

      <h2 className="text-[22px] font-bold text-state-ink">{title}</h2>
      <p className="mt-2 max-w-[28ch] text-[14px] leading-relaxed text-state-muted">
        {message}
      </p>

      {(primary || secondary) && (
        <div className="mt-8 flex w-full max-w-[320px] flex-col gap-3">
          {primary && <StateButton action={primary} variant="primary" />}
          {secondary && <StateButton action={secondary} variant="secondary" />}
        </div>
      )}
    </div>
  );
}

function StateButton({
  action,
  variant,
}: {
  action: StateAction;
  variant: "primary" | "secondary";
}) {
  const cls = cn(
    "flex h-[52px] w-full items-center justify-center rounded-[59px] text-[15px] transition-opacity hover:opacity-90",
    variant === "primary"
      ? "bg-state-accent font-bold text-white"
      : "border border-line bg-white font-semibold text-state-ink",
  );

  // A link where it navigates, a button where it acts — so keyboard and screen
  // readers get the right affordance rather than a div that happens to be
  // clickable.
  return action.href ? (
    <Link href={action.href} className={cls}>
      {action.label}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={cls}>
      {action.label}
    </button>
  );
}

/**
 * Stand-in for the illustrations in the Figma states.
 *
 * Those are bespoke line-art scenes (person, sun, birds, mountains) that need
 * exporting from Figma as SVG — they cannot be reconstructed faithfully from
 * the file's node data. This keeps the screens coherent in the meantime: the
 * same soft disc and weight across every state, so nine screens still look like
 * one family. Swap it for the real artwork when the exports land.
 */
export function StateGlyph({
  icon: Icon,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <span className="relative flex size-24 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-state-accent/8" />
      <span className="absolute inset-3 rounded-full bg-state-accent/10" />
      <Icon size={34} className="relative text-state-accent" />
    </span>
  );
}
