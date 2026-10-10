import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

/** The six painted skies in weather-scene.tsx. */
export type Scene =
  | "clear-day"
  | "clear-night"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow";

/**
 * WMO weather codes, as returned by Open-Meteo's `weather_code`.
 * Ranges rather than all 28 values: the label is what a person would say.
 */
const CODES: { max: number; label: string; scene: Scene }[] = [
  { max: 0, label: "Clear", scene: "clear-day" },
  { max: 1, label: "Mostly clear", scene: "clear-day" },
  { max: 2, label: "Partly cloudy", scene: "cloudy" },
  { max: 3, label: "Overcast", scene: "cloudy" },
  { max: 48, label: "Fog", scene: "cloudy" },
  { max: 57, label: "Drizzle", scene: "rain" },
  { max: 67, label: "Rain", scene: "rain" },
  { max: 77, label: "Snow", scene: "snow" },
  { max: 82, label: "Showers", scene: "rain" },
  { max: 86, label: "Snow showers", scene: "snow" },
  { max: 99, label: "Thunderstorms", scene: "storm" },
];

const ICONS: Record<Scene, LucideIcon> = {
  "clear-day": Sun,
  "clear-night": Moon,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
  snow: CloudSnow,
};

function entry(code: number) {
  return CODES.find((c) => code <= c.max) ?? CODES[CODES.length - 1];
}

/** Which painted sky a code gets. Clear skies split on day/night. */
export function sceneFor(code: number, isDay: boolean): Scene {
  const { scene } = entry(code);
  return scene === "clear-day" && !isDay ? "clear-night" : scene;
}

/** "Partly cloudy", "Thunderstorms" — the words under the temperature. */
export function labelFor(code: number, isDay: boolean): string {
  if (code <= 1) return isDay ? entry(code).label : "Clear night";
  return entry(code).label;
}

/** The row/cell icon. A few codes get a more specific glyph than their scene. */
export function iconFor(code: number, isDay: boolean): LucideIcon {
  if (code === 2) return isDay ? CloudSun : Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  return ICONS[sceneFor(code, isDay)];
}
