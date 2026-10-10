import { Skeleton } from "@/components/ui/skeleton";
import { Averages } from "./widgets";
import { getNormalHigh, type Place, type Weather } from "@/lib/weather";
import type { Settings } from "@/lib/types";

/**
 * Streams the Averages widget: the climate archive behind it is the slowest
 * request on the page, and the rest should not wait on one tile.
 */
export async function NormalHigh({
  place,
  units,
  weather,
}: {
  place: Place;
  units: Settings["units"];
  weather: Weather;
}) {
  const normal = await getNormalHigh(place, units);
  if (normal == null) return null;
  return <Averages weather={weather} normal={normal} />;
}

/** Same footprint as the tile, so the grid does not jump. */
export function NormalHighSkeleton() {
  return (
    <Skeleton className="h-[176px]" />
  );
}
