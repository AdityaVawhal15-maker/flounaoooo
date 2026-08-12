"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// The input style the redesigned auth screens share: a label above, a leading
// icon, and an optional trailing control (the password eye), all inside a
// rounded cream pill. Split out of the pages so login / signup / forgot / reset
// can't drift apart the way they did before the redesign.
//
// The label is a real <label htmlFor>, not styled text — the icon is aria-hidden
// so a screen reader announces the field once, by its label, rather than
// reading decorative glyphs.
export function AuthField({
  label,
  icon,
  trailing,
  error,
  className,
  id,
  ...props
}: {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[15px] font-bold text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex h-[56px] items-center gap-3 rounded-[16px] border bg-cream px-4 transition-colors",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15",
          error ? "border-danger" : "border-line",
        )}
      >
        {icon && (
          <span aria-hidden className="shrink-0 text-cocoa">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-cocoa/50",
            className,
          )}
          {...props}
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
