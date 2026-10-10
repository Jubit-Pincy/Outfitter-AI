import { GARMENTS } from "@/data/garment-shapes";
import { swatchFor } from "@/data/options";
import type { Item } from "@/lib/types";
import { cn } from "cn";

/** Relative luminance of a #rrggbb swatch. */
function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [16, 8, 0]
    .map((shift) => ((n >> shift) & 255) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
}

export function Garment({
  item,
  className,
}: {
  item: Pick<Item, "shape" | "colorName" | "name" | "photo">;
  className?: string;
}) {
  // A piece added from a photo shows the photo; the drawings are for the
  // seeded wardrobe, which has none.
  if (item.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.photo}
        alt={item.name}
        className={cn("rounded-[10px] block h-auto w-full max-w-full object-contain", className)}
      />
    );
  }

  const shape = GARMENTS[item.shape] ?? GARMENTS.shirt;
  const fill = swatchFor(item.colorName);
  const dark = luminance(fill) < 0.18;
  return (
    <svg
      viewBox={shape.viewBox}
      role="img"
      aria-label={item.name}
      className={cn("block h-auto w-full max-w-full", className)}
      // Seams and buttons vanished on black and charcoal garments when the
      // line was always ink; flip it to light once the cloth is dark.
      style={
        {
          "--garment-line": dark
            ? "rgba(246,245,241,.45)"
            : "rgba(32,38,43,.35)",
          "--garment-detail": dark
            ? "rgba(246,245,241,.3)"
            : "rgba(32,38,43,.32)",
        } as React.CSSProperties
      }
    >
      {shape.render(fill)}
    </svg>
  );
}
