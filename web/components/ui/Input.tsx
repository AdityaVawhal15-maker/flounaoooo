import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <label className="block w-full text-left">
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-cocoa">
          {label}
        </span>
      )}
      <input
        id={id}
        className={cn(
          "h-13 w-full rounded-[14px] border border-line bg-card px-4 text-[15px] text-ink placeholder:text-cocoa/50",
          "outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className,
        )}
        {...props}
      />
      {error && <span className="mt-1 block text-[12px] text-danger">{error}</span>}
    </label>
  );
}
