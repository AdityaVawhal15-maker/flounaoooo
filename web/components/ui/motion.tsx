"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

// Premium, restrained motion primitives used across the app.
// Tuned for a calm high-end feel: short, eased, never bouncy.

const EASE = [0.22, 1, 0.36, 1] as const; // gentle ease-out

// Fades + lifts in on mount. Use `delay` to sequence, or wrap children in
// <Stagger> for automatic sequencing.
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 12,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
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
      transition={{ duration: 0.5, ease: EASE }}
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
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
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
      transition={{ duration: 0.2, ease: EASE }}
      className={cn("will-change-transform", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
