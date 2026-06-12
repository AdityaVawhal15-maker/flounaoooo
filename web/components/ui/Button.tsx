import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost";
type Size = "lg" | "md" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-cocoa text-white hover:bg-[#7a5234] disabled:bg-cocoa/50",
  secondary: "bg-beige text-ink hover:bg-[#e6d8cc] disabled:opacity-50",
  accent: "bg-accent text-white hover:bg-[#d4570f] disabled:bg-accent/50",
  ghost: "bg-transparent text-ink hover:bg-beige/60 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  lg: "h-14 px-6 text-[17px]",
  md: "h-11 px-5 text-[15px]",
  sm: "h-9 px-4 text-[13px]",
};

export function Button({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
