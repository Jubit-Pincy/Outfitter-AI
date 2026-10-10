import { cn } from "cn";

/**
 * A card: paper on linen, the app's one surface.
 *
 * It lived under `weather/` and was used only there, while Today and Schedule
 * repeated `rounded-2xl bg-paper` by hand — four copies that could drift apart.
 */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-paper text-ink",
        className
      )}
    >
      {children}
    </section>
  );
}

/** The small uppercase caption every widget wears. */
export function PanelTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
      {Icon ? <Icon className="size-3.5" strokeWidth={1.8} /> : null}
      {children}
    </h2>
  );
}
