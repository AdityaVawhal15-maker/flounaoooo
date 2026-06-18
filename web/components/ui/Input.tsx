import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({
  label,
  error,
  className,
  id,
  icon,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: ReactNode; // leading icon inside the field
  trailing?: ReactNode; // trailing control (e.g. password eye toggle)
}) {
  return (
    <label className="block w-full text-left">
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-cocoa">
          {label}
        </span>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cocoa/60">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={cn(
            "h-13 w-full rounded-[14px] border border-line bg-card text-[15px] text-ink placeholder:text-cocoa/50",
            icon ? "pl-11" : "pl-4",
            trailing ? "pr-11" : "pr-4",
            "outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20",
            error && "border-danger focus:border-danger focus:ring-danger/20",
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>
      {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
    </label>
  );
}
