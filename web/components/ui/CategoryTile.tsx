"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// A themed icon on a soft two-tone gradient — the imagery system for the app.
// Each category gets its own hue so screens feel colorful without photos.
export type TileTheme = {
  from: string;
  to: string;
  fg: string;
};

export const TILE_THEMES: Record<string, TileTheme> = {
  orange: { from: "#ffe9db", to: "#ffd9bf", fg: "#e8651a" },
  green: { from: "#e3f6ec", to: "#cdeedd", fg: "#1ca65c" },
  purple: { from: "#efe7fb", to: "#e0d2f7", fg: "#8b5cf6" },
  blue: { from: "#e3f0fb", to: "#cfe4f7", fg: "#2f7ec9" },
  pink: { from: "#fde7ef", to: "#f9d2e1", fg: "#db2777" },
  amber: { from: "#fcf0d8", to: "#f7e3b8", fg: "#c98a16" },
  cocoa: { from: "#f0e6de", to: "#e6d6c8", fg: "#8b5e3c" },
};

export function CategoryTile({
  icon: Icon,
  theme = "orange",
  size = 44,
  active = false,
  className,
}: {
  icon: LucideIcon;
  theme?: keyof typeof TILE_THEMES;
  size?: number;
  active?: boolean;
  className?: string;
}) {
  const t = TILE_THEMES[theme] ?? TILE_THEMES.orange!;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-tile transition-shadow",
        active && "ring-2 ring-offset-2 ring-offset-cream",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
        ...(active ? { boxShadow: `0 0 0 2px ${t.fg}` } : {}),
      }}
    >
      <Icon size={Math.round(size * 0.46)} style={{ color: t.fg }} strokeWidth={2.1} />
    </span>
  );
}
