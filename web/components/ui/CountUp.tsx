"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

// Animates a number from 0 → value once on mount. `format` maps the raw
// number to display text (e.g. rupees).
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(() => format(0));
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // re-run only when the target value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={node} className={className}>
      {display}
    </span>
  );
}
