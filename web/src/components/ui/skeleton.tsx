import { cn } from "cn";

/** A card-shaped placeholder while a slow panel streams in. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-2xl border border-stitch bg-linen-2",
        className
      )}
    />
  );
}
