"use client";

import { cn } from "cn";

/**
 * A pressable pill: wardrobe's category filters, schedule's times and slot
 * kinds. Selected is ink on paper, the way the nav marks its current page.
 *
 * Schedule kept these classes in a local `chip` const and Wardrobe repeated
 * them inline, which is how the two drifted to different hover states.
 */
export function Chip({
  selected = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "rounded-[20px] border px-4 py-1.5 text-[13.5px] whitespace-nowrap transition-colors",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-stitch bg-paper hover:bg-linen-2 active:bg-linen",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
