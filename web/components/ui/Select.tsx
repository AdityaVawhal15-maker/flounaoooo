"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

// A themed replacement for <select>.
//
// The native control's option list is drawn by the operating system, not the
// page, so it cannot be styled: it arrives as a full-width white sheet with the
// OS blue highlight, which looks like a different application on top of ours.
// The trigger below still looks and behaves like the surrounding fields, but
// the list is ours, so it carries the brand and follows the theme.
//
// Accessibility is the reason to be careful here, since replacing a native
// control means re-implementing what it gave for free: the trigger is a real
// button with combobox semantics, the list is a listbox of options, arrow keys
// move the active option, Enter and Space choose it, Escape closes without
// changing anything, and focus returns to the trigger either way.

export type SelectOption = { value: string; label: string };

export function Select({
  value,
  options,
  onChange,
  label,
  className,
  disabled,
  variant = "account",
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Accessible name, when there is no visible <label> wrapping this. */
  label?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Which palette to wear. The account screens and the auth screens are drawn
   * on different grounds, so the control follows whichever it sits on rather
   * than importing one look into the other.
   */
  variant?: "account" | "auth";
}) {
  const [open, setOpen] = useState(false);
  // These controls often sit near the bottom of a sheet, where a list opening
  // downward runs straight off the screen. Decided per open, from where the
  // trigger actually is, rather than assumed.
  const [dropUp, setDropUp] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  const close = useCallback((focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  // Pointer outside, or the tab key leaving the control, closes it.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Keep the active option in view when moving through a long list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      // The keys a native select opens on.
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        setActive(Math.max(0, options.findIndex((o) => o.value === value)));
        const box = triggerRef.current?.getBoundingClientRect();
        if (box) {
          const below = window.innerHeight - box.bottom;
          setDropUp(below < Math.min(232, options.length * 44 + 16) && box.top > below);
        }
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Tab":
        // Let focus move on, but never leave a floating list behind.
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          setActive(Math.max(0, options.findIndex((o) => o.value === value)));
          const box = triggerRef.current?.getBoundingClientRect();
          if (box) {
            const below = window.innerHeight - box.bottom;
            setDropUp(below < Math.min(232, options.length * 44 + 16) && box.top > below);
          }
          setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition-colors",
          variant === "auth"
            ? "h-[60px] rounded-[16px] bg-auth-well px-4 text-[17px] text-auth-ink"
            : "h-12 rounded-[12px] border bg-acct-bg px-3.5 text-[15px] text-acct-ink",
          variant === "account" &&
            (open ? "border-acct-accent" : "border-line hover:border-acct-accent/50"),
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          size={17}
          className={cn(
            "shrink-0 transition-transform",
            variant === "auth" ? "text-auth-muted" : "text-acct-muted",
            open && "rotate-180",
            open && variant === "account" && "text-acct-accent",
          )}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          // Sized to the trigger rather than the viewport, and capped so a long
          // list scrolls inside itself instead of running off the sheet.
          className={cn(
            "absolute z-50 max-h-56 w-full overflow-y-auto border p-1 shadow-lift",
            dropUp ? "bottom-full mb-1.5" : "mt-1.5",
            variant === "auth"
              ? "rounded-[16px] border-auth-line bg-auth-well"
              : "rounded-[12px] border-line bg-card",
          )}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[9px] px-3 py-2.5 transition-colors",
                  variant === "auth" ? "text-[16px]" : "text-[15px]",
                  i === active && (variant === "auth" ? "bg-auth-accent/10" : "bg-acct-tint"),
                  isSelected
                    ? variant === "auth"
                      ? "font-semibold text-auth-accent"
                      : "font-semibold text-acct-accent"
                    : variant === "auth"
                      ? "text-auth-ink"
                      : "text-acct-ink",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {isSelected && (
                  <Check
                    size={15}
                    className={cn(
                      "shrink-0",
                      variant === "auth" ? "text-auth-accent" : "text-acct-accent",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
