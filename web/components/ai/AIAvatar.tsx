"use client";

import React from "react";
import { cn } from "@/lib/cn";

type AIAvatarProps = {
  size?: number;
  className?: string;
  active?: boolean;
};

export function AIAvatar({ size = 32, className, active = false }: AIAvatarProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "relative flex items-center justify-center rounded-full bg-flouna-ivory border border-flouna-maroon/20 text-flouna-maroon shadow-sm select-none transition-all duration-300",
        active && "ring-2 ring-flouna-orange/40 shadow-ai-orange",
        className
      )}
    >
      {/* Subtle organic intelligence bloom SVG mark */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "w-3/5 h-3/5 transition-transform duration-500",
          active && "scale-105"
        )}
      >
        <path
          d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
          fill="currentColor"
          className="text-flouna-maroon"
        />
        <circle
          cx="12"
          cy="12"
          r="2.5"
          fill="currentColor"
          className={cn(
            "text-flouna-orange transition-opacity duration-300",
            active ? "opacity-100" : "opacity-90"
          )}
        />
      </svg>

      {/* Subtle floating pulse signal when active */}
      {active && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flouna-orange opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-flouna-orange" />
        </span>
      )}
    </div>
  );
}
