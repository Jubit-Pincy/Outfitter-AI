import credits from "../../public/sky/credits.json";
import { sceneFor } from "@/lib/weather-codes";

/**
 * Attribution for the hero photograph. Three of the five are CC BY-SA, which
 * requires naming the photographer and the licence wherever the photo appears.
 */
export function skyCredit(code: number, isDay: boolean) {
  const scene = sceneFor(code, isDay);
  const key = scene === "snow" ? "rain" : scene;
  return (credits as Record<string, { author: string; license: string; source: string }>)[key];
}
