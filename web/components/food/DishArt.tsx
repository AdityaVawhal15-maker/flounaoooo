"use client";

import { useState } from "react";

// Dish artwork tiles. The catalog has no photography yet, so every dish gets
// a deterministic, tasteful stand-in: a soft two-tone gradient + a food glyph
// picked from the dish name. Same dish always renders the same tile, and the
// palette stays inside the brand's warm range. Swap for real photos by adding
// an imageUrl to the catalog later — this component is the single place to
// change.

const VISUALS: { match: RegExp; emoji: string; from: string; to: string }[] = [
  { match: /biryani|pulao|rice/i, emoji: "🍛", from: "#ffe8cc", to: "#ffd8a8" },
  { match: /pizza/i, emoji: "🍕", from: "#ffe3e0", to: "#ffc9c2" },
  { match: /burger/i, emoji: "🍔", from: "#fff3bf", to: "#ffe066" },
  { match: /dosa|idli|vada|uttapam/i, emoji: "🥞", from: "#fff0d9", to: "#ffdfb0" },
  { match: /momo|dumpling/i, emoji: "🥟", from: "#f3ecff", to: "#e3d5ff" },
  { match: /noodle|chowmein|hakka|maggi/i, emoji: "🍜", from: "#ffe8d9", to: "#ffd0b5" },
  { match: /thali|meal|combo/i, emoji: "🍽️", from: "#e8f7ee", to: "#c9ecd7" },
  { match: /paneer|tikka|kebab|tandoor/i, emoji: "🍢", from: "#ffe0e9", to: "#ffc2d4" },
  { match: /chicken|butter/i, emoji: "🍗", from: "#ffeeda", to: "#ffddb3" },
  { match: /cake|pastry|dessert|brownie|gulab|sweet/i, emoji: "🍰", from: "#ffe6f0", to: "#ffc9e0" },
  { match: /coffee|latte|cappuccino|tea|chai/i, emoji: "☕", from: "#f0e6de", to: "#e0cfc0" },
  { match: /salad|healthy|bowl/i, emoji: "🥗", from: "#e6f7e6", to: "#c8ecc8" },
  { match: /shawarma|roll|wrap|frankie/i, emoji: "🌯", from: "#fff1dc", to: "#ffe1b8" },
  { match: /samosa|pakora|chaat|bhel|pani/i, emoji: "🥙", from: "#fdf2d0", to: "#f9e29c" },
  { match: /sandwich|toast/i, emoji: "🥪", from: "#fdeee0", to: "#f9d9bd" },
  { match: /juice|shake|smoothie|lassi/i, emoji: "🥤", from: "#e3f4ff", to: "#c2e5ff" },
  { match: /fish|prawn|seafood/i, emoji: "🐟", from: "#e0f2f7", to: "#bfe3ee" },
  { match: /egg|omelette/i, emoji: "🍳", from: "#fff8d6", to: "#ffef9e" },
];

// Warm fallback palette, cycled deterministically by name.
const FALLBACKS = [
  { emoji: "🍲", from: "#ffe8cc", to: "#ffd8a8" },
  { emoji: "🍱", from: "#f0e6de", to: "#e2d0be" },
  { emoji: "🫕", from: "#ffe3e0", to: "#ffc9c2" },
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function dishVisual(name: string) {
  return (
    VISUALS.find((v) => v.match.test(name)) ??
    FALLBACKS[hashCode(name) % FALLBACKS.length]!
  );
}

export function DishArt({
  name,
  image,
  size = 48,
  className = "",
}: {
  name: string;
  image?: string;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const v = dishVisual(name);

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setImgError(true)}
        className={`shrink-0 rounded-2xl object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.52),
        background: `linear-gradient(135deg, ${v.from}, ${v.to})`,
      }}
    >
      {v.emoji}
    </span>
  );
}
