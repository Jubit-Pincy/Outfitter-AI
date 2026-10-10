/**
 * The reading's position on a rail: a small ink dot with a paper collar, so it
 * stays visible over any colour the rail runs through.
 *
 * Shared because the ten-day rows and the metric tiles drew the same marker
 * from the same eight classes, and only one of them clamped its position.
 */
export function NowDot({ at }: { at: number }) {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink"
      // Clamped, because a temperature outside the scale's own range used to
      // put the dot outside the rail.
      style={{ left: `${Math.min(Math.max(at, 0), 1) * 100}%` }}
    />
  );
}
