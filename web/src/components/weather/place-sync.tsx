"use client";

import { useEffect } from "react";
import { useOutfitter } from "@/lib/store";

/**
 * Adopts the place the forecast was actually rendered for.
 *
 * `/weather` takes its city from the URL, while the header and Today take
 * theirs from the store. Opening a link for one city while the store holds
 * another put two different cities on the same screen — the header naming one,
 * the hero showing the other. Whatever the page fetched is the truth, so the
 * store follows it.
 */
export function PlaceSync({
  place,
  coords,
  units,
}: {
  /** The resolved city name, as the forecast returned it. */
  place: string;
  coords: { lat: number; lon: number };
  units: "Celsius" | "Fahrenheit";
}) {
  const settings = useOutfitter((s) => s.settings);
  const updateSettings = useOutfitter((s) => s.updateSettings);

  const saved = settings.coords;
  // Within about a kilometre is the same place under a different name.
  const samePlace =
    saved !== undefined &&
    Math.abs(saved.lat - coords.lat) < 0.01 &&
    Math.abs(saved.lon - coords.lon) < 0.01;

  useEffect(() => {
    // Don't rename the reader's own choice. "Use my location" saves coordinates
    // under the name "Current location", and the forecast reverse-geocodes the
    // same coordinates to "Ajmer, Rajasthan" — adopting that would quietly
    // replace their label with the geocoder's every time they opened /weather.
    if (samePlace) return;
    if (settings.location === place && settings.units === units) return;
    updateSettings({ location: place, coords, units });
    // Coordinates are a fresh object each render; the name, units and whether
    // this is the same spot are what decide if anything actually changed.
  }, [
    place,
    units,
    samePlace,
    settings.location,
    settings.units,
    coords,
    updateSettings,
  ]);

  return null;
}
