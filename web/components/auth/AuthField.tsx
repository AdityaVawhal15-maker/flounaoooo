"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// The field treatment the "Log in or sign up" flow shares (Figma 2177:71xx):
// a small accent-orange label above a white pill input with a soft pink border.
// Split out so the entry, create-account and password screens can't drift.
//
// The label is a real <label htmlFor> and any icon is aria-hidden, so a screen
// reader announces each field once by its name rather than reading decorative
// glyphs.
export function AuthField({
  label,
  icon,
  trailing,
  error,
  className,
  id,
  ...props
}: {
  label?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[13px] font-medium text-auth-ink"
        >
          {label}
        </label>
      )}
      {/* Figma 2527:5156 — 376×56 well, radius 14, filled rather than
          outlined. On the dark ground a border reads as a seam, so the field
          is a lighter block instead. */}
      <div
        className={cn(
          "flex h-14 items-center gap-3 rounded-[14px] bg-auth-well px-4 transition-shadow",
          "focus-within:ring-2 focus-within:ring-white/25",
          error && "ring-2 ring-danger",
        )}
      >
        {icon && (
          <span aria-hidden className="shrink-0 text-auth-muted">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[16px] text-auth-ink outline-none placeholder:text-auth-muted",
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

/** Primary action — a white pill with a black label (Figma 2527:5156). */
export function AuthButton({
  children,
  disabled,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "h-14 w-full rounded-[28px] text-[17px] font-semibold transition-colors",
        disabled
          ? "bg-auth-disabled text-auth-disabled-ink"
          : "bg-auth-btn text-auth-btn-ink hover:bg-white/90",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** The white outlined pills beneath the OR rule (Google, phone, email). */
export function AuthAltButton({
  children,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  type?: "button";
}) {
  return (
    <button
      className="flex h-14 w-full items-center justify-center gap-3 rounded-[28px] bg-auth-btn text-[16px] font-semibold text-auth-alt-ink transition-colors hover:bg-white/90"
      {...props}
    >
      {children}
    </button>
  );
}

/** The "OR" rule that separates the primary action from the alternatives. */
export function AuthOr() {
  return (
    <div className="flex items-center gap-4 text-[13px] font-medium text-auth-muted">
      <span className="h-px flex-1 bg-auth-line/30" />
      OR
      <span className="h-px flex-1 bg-auth-line/30" />
    </div>
  );
}

/** Shared header: back button, lotus, headline, subtitle. */
export function AuthHeader({
  onBack,
  children,
}: {
  onBack: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      {onBack}
      <div className="mt-6 flex flex-col items-center text-center">{children}</div>
    </>
  );
}
