"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

// Premium, restrained motion primitives used across the app.
// Tuned for a calm high-end feel: short, eased, never bouncy.

// Figma EASE_OUT, the file's easing for everything that is not LINEAR.
const EASE_OUT_C = [0, 0, 0.58, 1] as const;

// Fades + lifts in on mount. Use `delay` to sequence, or wrap children in
// <Stagger> for automatic sequencing.
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 12,
  duration = 0.3,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number; duration?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE_OUT_C, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Reveals when scrolled into view (once). For lists/sections below the fold.
export function ScrollReveal({
  children,
  className,
  y = 16,
  ...props
}: HTMLMotionProps<"div"> & { y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: EASE_OUT_C }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Container that staggers its direct <StaggerItem> children.
export function Stagger({
  children,
  className,
  delayChildren = 0.05,
  ...props
}: HTMLMotionProps<"div"> & { delayChildren?: number }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 12,
  ...props
}: HTMLMotionProps<"div"> & { y?: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE_OUT_C } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Pressable surface: subtle lift on hover, press-down on tap. For cards/buttons.
export function Pressable({
  children,
  className,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.1, ease: EASE_OUT_C }}
      className={cn("will-change-transform", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ---- Motion spec from the Figma prototype -------------------------------
//
// Read out of the file's own transitions rather than guessed at: 831 of them
// carry a duration, and they cluster on a small scale. Keeping the numbers
// here means a screen built later matches the prototype without anyone
// re-measuring it.
//
//   150ms  297 uses      75ms   48 uses
//   300ms  282 uses      50ms   44 uses
//   100ms  148 uses     200/600 rare
//
// Easing is LINEAR (588) or EASE_OUT (235); EASE_IN appears 8 times and is
// treated as an outlier rather than part of the system.
export const MOTION = {
  instant: 0.05,
  fast: 0.1,
  quick: 0.15,
  base: 0.3,
  slow: 0.6,
} as const;

export const EASE_OUT = [0, 0, 0.58, 1] as const; // Figma EASE_OUT
export const LINEAR = [0, 0, 1, 1] as const; // Figma LINEAR

const OFFSET = {
  // Figma's MOVE_IN direction is the direction the incoming frame TRAVELS, so
  // content starts at the opposite edge: "top" rises into place from below,
  // which is what makes the payment sheet read as a sheet.
  top: { x: 0, y: 28 },
  bottom: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
} as const;

/**
 * The prototype's MOVE_IN transition — the second most common one in the file
 * (113 uses), and the one the app had no equivalent for. Content enters from
 * the named edge rather than simply fading, which is what makes a step feel
 * like it came from somewhere.
 */
export function SlideIn({
  children,
  className,
  direction = "top",
  duration = MOTION.base,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & {
  /** Figma MOVE_IN direction — the way the content travels, not where it starts. */
  direction?: keyof typeof OFFSET;
  duration?: number;
  delay?: number;
}) {
  const off = OFFSET[direction];
  return (
    <motion.div
      initial={{ opacity: 0, ...off }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, ease: EASE_OUT, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
