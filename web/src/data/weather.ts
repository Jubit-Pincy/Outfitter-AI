import type { Day, Hour, Weather } from "@/lib/weather";

/** The Today page's standing lede, unchanged from the prototype. */
export const LEDE =
  "Two picks, built from the forecast, your day, and what you haven't worn lately.";

/** Shape of a Jaipur September day, used when the forecast can't be reached. */
const SAMPLE_TEMPS = [
  27, 26, 26, 26, 25, 25, 24, 25, 27, 29, 30, 32,
  33, 34, 34, 34, 33, 31, 30, 29, 28, 28, 27, 26,
];

/** Local "YYYY-MM-DD" for today plus `offset` days. */
function localDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const TODAY = localDate();

const hours: Hour[] = SAMPLE_TEMPS.map((temp, i) => ({
  time: `${TODAY}T${String(i).padStart(2, "0")}:00`,
  temp,
  code: i >= 7 && i <= 17 ? 2 : 1,
  isDay: i >= 6 && i <= 18,
  pop: 20,
}));

const days: Day[] = [
  { high: 34, low: 24, code: 2, pop: 20 },
  { high: 31, low: 25, code: 61, pop: 60 },
  { high: 31, low: 25, code: 61, pop: 60 },
  { high: 30, low: 24, code: 61, pop: 65 },
  { high: 30, low: 23, code: 80, pop: 45 },
  { high: 30, low: 23, code: 80, pop: 40 },
  { high: 30, low: 23, code: 80, pop: 45 },
  { high: 28, low: 22, code: 61, pop: 55 },
  { high: 31, low: 22, code: 80, pop: 40 },
  { high: 31, low: 23, code: 80, pop: 35 },
].map((day, i) => ({ ...day, date: localDate(i) }));

/**
 * Sample weather. `getWeather` returns this with `stale: true` when the live
 * request fails, so every screen still renders something plausible.
 *
 * Built at call time rather than frozen into the module: it used to be stamped
 * 11 September 2026, so a failure on any other day printed the wrong weekdays.
 */
export const FALLBACK_WEATHER: Weather = {
  place: "Jaipur",
  coords: { lat: 26.9196, lon: 75.7878 },
  unit: "C",
  units: { wind: "kph", rain: "mm", distance: "km" },
  now: {
    time: `${TODAY}T12:00`,
    temp: 31,
    feelsLike: 35,
    code: 2,
    isDay: true,
    label: "Hazy sun, humid",
    high: 34,
    low: 24,
    summary: "Partly cloudy conditions, peaking near 15:00.",
  },
  hourly: hours,
  daily: days,
  metrics: {
    aqi: { value: 92, label: "Satisfactory", change: 3 },
    wind: { speed: 7, gusts: 14, direction: 252, compass: "WSW" },
    uv: { value: 7, label: "High", window: "09:30\u201316:30" },
    sun: { sunrise: "06:15", sunset: "18:40" },
    humidity: { value: 63, dewPoint: 19 },
    visibility: 17,
    pressure: 1009,
    precipitation: { past24: 0, next24: 3, today: 0, tomorrow: 3 },
    moon: { phase: "New moon", illumination: 0, daysToFull: 14.8, waxing: true },
  },
  // The sample has no quarter-hourly numbers behind it, and inventing a rain
  // that is not coming is worse than saying nothing.
  nowcast: null,
  stale: true,
};
