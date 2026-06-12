import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card bg-card p-4 shadow-card border border-line/60",
        className,
      )}
      {...props}
    />
  );
}
