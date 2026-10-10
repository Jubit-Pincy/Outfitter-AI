import { FALLBACK_WEATHER } from "@/data/weather";
import { nowcastFrom, STEPS, type Nowcast } from "@/lib/nowcast";
import { labelFor } from "@/lib/weather-codes";
import type { Settings } from "@/lib/types";

/**
 * The place the forecast falls back to before anyone has signed in or picked
 * a city. It used to be read from the seeded settings file; the real settings
 * now belong to an account, which this module cannot see — it runs on the
 * server, before the store exists — so the cookie carries the choice and this
 * is only the starting point.
 */
const DEFAULT_PLACE: Pick<Settings, "location" | "units"> = {
  location: "Jaipur",
  units: "Celsius",
};

export interface Hour {
  /** Local naive ISO, e.g. "2026-09-11T14:00". */
  time: string;
  temp: number;
  code: number;
  isDay: boolean;
  pop: number;
}

export interface Day {
  /** Local date, "2026-09-11". */
  date: string;
  code: number;
  high: number;
  low: number;
  pop: number;
}

export interface Weather {
  place: string;
  /** Where the forecast is for, so the client store can hold the same spot. */
  coords: { lat: number; lon: number };
  unit: "C" | "F";
  /** Unit words that follow `unit`: metric for Celsius, imperial for Fahrenheit. */
  units: { wind: string; rain: string; distance: string };
  /** Local naive ISO of the observation. */
  now: {
    time: string;
    temp: number;
    feelsLike: number;
    code: number;
    isDay: boolean;
    label: string;
    high: number;
    low: number;
    summary: string;
  };
  /** 24 hours from the current hour. */
  hourly: Hour[];
  /** 10 days from today. */
  daily: Day[];
  metrics: {
    aqi: {
      value: number;
      label: string;
      /** Difference against the same hour yesterday, for the "vs yesterday" line. */
      change: number | null;
    } | null;
    wind: { speed: number; gusts: number; direction: number; compass: string };
    uv: {
      value: number;
      label: string;
      /** Hours today when UV is 3 or more, e.g. "09:30–16:30". */
      window: string | null;
    };
    sun: { sunrise: string; sunset: string };
    humidity: { value: number; dewPoint: number };
    /** Kilometres. */
    visibility: number;
    /** hPa at sea level. */
    pressure: number;
    precipitation: {
      /** Totals over the rolling 24 hours behind and ahead, as Apple shows them. */
      past24: number;
      next24: number;
      today: number;
      tomorrow: number;
    };
    moon: {
      phase: string;
      illumination: number;
      daysToFull: number;
      /** Lit edge on the right while waxing, on the left while waning. */
      waxing: boolean;
    };
  };
  /**
   * The next two hours of precipitation, when there is something to say about
   * them. Null on a dry afternoon — and on the sample data, which has no
   * quarter-hourly numbers behind it.
   */
  nowcast: Nowcast | null;
  /** True when the live fetch failed and these are the sample numbers. */
  stale: boolean;
}

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE = "https://nominatim.openstreetmap.org/reverse";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "weather_code",
  "relative_humidity_2m",
  "dew_point_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "pressure_msl",
  "visibility",
  "is_day",
].join(",");

const HOURLY_FIELDS =
  "temperature_2m,weather_code,precipitation_probability,is_day,precipitation,uv_index";

/** Quarter-hourly precipitation, for the "rain in 20 minutes" line. */
const MINUTELY_FIELDS = "precipitation";

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "precipitation_sum",
  "sunrise",
  "sunset",
  "uv_index_max",
].join(",");

/** Cache every upstream call for 15 minutes, shared across requests. */
async function get<T>(
  url: string,
  headers?: HeadersInit,
  revalidate = 900
): Promise<T> {
  const res = await fetch(url, { headers, next: { revalidate } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function compassFor(degrees: number) {
  return COMPASS[Math.round(degrees / 22.5) % 16];
}

/** Open-Meteo's US AQI, banded the way the tile reads it out. */
function aqiLabel(value: number) {
  if (value <= 50) return "Good";
  if (value <= 100) return "Satisfactory";
  if (value <= 150) return "Poor for some";
  if (value <= 200) return "Unhealthy";
  if (value <= 300) return "Very unhealthy";
  return "Hazardous";
}

function uvLabel(value: number) {
  if (value < 3) return "Low";
  if (value < 6) return "Moderate";
  if (value < 8) return "High";
  if (value < 11) return "Very high";
  return "Extreme";
}

const PHASES = [
  "New moon", "Waxing crescent", "First quarter", "Waxing gibbous",
  "Full moon", "Waning gibbous", "Last quarter", "Waning crescent",
];

const SYNODIC = 29.530588853;

/**
 * Moon phase from the date alone — Open-Meteo has no lunar data and pulling in
 * an ephemeris library for one tile is not worth it. Counted from the known new
 * moon of 6 Jan 2000, accurate to well under a day.
 */
export function moonFor(date: Date) {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const fraction = age / SYNODIC;
  return {
    phase: PHASES[Math.round(fraction * 8) % 8],
    illumination: Math.round((1 - Math.cos(fraction * 2 * Math.PI)) * 50),
    /** True in the first half of the cycle, when the lit edge is on the right. */
    waxing: fraction < 0.5,
    // Full moon sits at half a cycle; wrap if we are already past it.
    daysToFull: Math.round(((SYNODIC / 2 - age + SYNODIC) % SYNODIC) * 10) / 10,
  };
}

/** "09:30-16:30": the stretch of today when UV is worth protecting against. */
function uvWindow(
  hourly: ForecastResponse["hourly"],
  today: string
): string | null {
  const hits = hourly.time
    .map((time, i) => [time, hourly.uv_index[i]] as const)
    .filter(([time, uv]) => time.slice(0, 10) === today && uv >= 3);
  if (hits.length === 0) return null;
  const first = hits[0][0].slice(11, 16);
  // The last hour above the threshold runs until the end of that hour.
  const lastHour = Number(hits[hits.length - 1][0].slice(11, 13)) + 1;
  return `${first}\u2013${String(lastHour).padStart(2, "0")}:00`;
}

/** Rainfall to one decimal in mm, two in inches. */
function round(value: number, imperial: boolean) {
  const factor = imperial ? 100 : 10;
  return Math.round(value * factor) / factor;
}

/** "Rain starting around 14:00" / "Partly cloudy through the evening". */
function summarize(hours: Hour[], label: string) {
  const wet = hours.slice(1, 13).find((h) => h.pop >= 50);
  if (wet) return `Rain likely around ${wet.time.slice(11, 16)}.`;
  const warmest = hours.reduce((a, b) => (b.temp > a.temp ? b : a), hours[0]);
  return `${label} conditions, peaking near ${warmest.time.slice(11, 16)}.`;
}

/** Where to get the forecast for: a typed place name, or browser coordinates. */
export type Place = string | { lat: number; lon: number };

/** Name of the cookie carrying the client's location to the server. */
export const PLACE_COOKIE = "outfitter-place";

/** `place=…` or `lat=…&lon=…`, shared by the links and the cookie. */
export function placeQuery(settings: Settings) {
  return settings.coords
    ? `lat=${settings.coords.lat}&lon=${settings.coords.lon}`
    : `place=${encodeURIComponent(settings.location)}`;
}

/** `/weather` link for the settings the client holds. */
export function weatherHref(settings: Settings) {
  return `/weather?${placeQuery(settings)}&units=${settings.units}`;
}

/** Read a `Place` and units out of a query string or a route's search params. */
export function placeFrom(
  params: Record<string, string | string[] | undefined> | string,
  fallback: Pick<Settings, "location" | "units">
): { place: Place; units: Settings["units"] } {
  const read =
    typeof params === "string"
      ? (key: string) => new URLSearchParams(params).get(key) ?? ""
      : (key: string) =>
          typeof params[key] === "string" ? (params[key] as string) : "";

  const lat = Number(read("lat"));
  const lon = Number(read("lon"));
  const coords =
    read("lat") && read("lon") && Number.isFinite(lat) && Number.isFinite(lon);

  return {
    place: coords ? { lat, lon } : read("place") || fallback.location,
    units: read("units") === "Fahrenheit" ? "Fahrenheit" : fallback.units,
  };
}

interface Spot {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Coordinates need a name to show; Open-Meteo's forecast doesn't return one. */
async function reverse(lat: number, lon: number): Promise<Spot> {
  const spot: Spot = {
    name: "Current location",
    latitude: lat,
    longitude: lon,
    timezone: "auto",
  };
  try {
    const data = await get<{ address?: Record<string, string> }>(
      `${REVERSE}?lat=${lat}&lon=${lon}&format=json&zoom=10&accept-language=en`,
      // Nominatim rejects requests that don't identify themselves.
      { "User-Agent": "OutfitterAI/0.1" }
    );
    const a = data.address ?? {};
    const town = a.city ?? a.town ?? a.village ?? a.county ?? a.state;
    // OSM names cities administratively ("Jaipur Municipal Corporation").
    const trimmed = town
      ?.replace(/\s+(Municipal Corporation|Metropolitan Municipality|Municipality|District|Tehsil|County)$/i, "")
      .trim();
    if (trimmed) spot.name = [trimmed, a.country].filter(Boolean).join(", ");
  } catch {
    // A missing name is not worth failing the forecast over.
  }
  return spot;
}

/** A `Place` — a typed name or a pair of coordinates — as a located spot. */
function spotFor(place: Place): Promise<Spot> {
  return typeof place === "string" ? forward(place) : reverse(place.lat, place.lon);
}

/** Look a typed place name up. */
async function forward(place: string): Promise<Spot> {
  const geo = await get<GeoResponse>(
    `${GEO}?name=${encodeURIComponent(place)}&count=1&language=en&format=json`
  );
  const hit = geo.results?.[0];
  if (!hit) throw new Error(`no such place: ${place}`);
  return {
    name: [hit.name, hit.country].filter(Boolean).join(", "),
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone,
  };
}

interface GeoResponse {
  results?: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }[];
}

interface ForecastResponse {
  current: Record<string, number> & { time: string };
  minutely_15?: { time: string[]; precipitation: number[] };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    is_day: number[];
    precipitation: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
}

interface AirResponse {
  current: { us_aqi: number };
  hourly: { time: string[]; us_aqi: (number | null)[] };
}

const toF = (c: number) => Math.round((c * 9) / 5 + 32);

/**
 * The sample figures are metric. Relabelling them °F without converting is how
 * a failed request used to report 31°F on a Jaipur afternoon.
 */
function toUnits(w: Weather, imperial: boolean): Weather {
  if (!imperial) return w;
  const m = w.metrics;
  return {
    ...w,
    now: {
      ...w.now,
      temp: toF(w.now.temp),
      feelsLike: toF(w.now.feelsLike),
      high: toF(w.now.high),
      low: toF(w.now.low),
    },
    hourly: w.hourly.map((h) => ({ ...h, temp: toF(h.temp) })),
    daily: w.daily.map((d) => ({ ...d, high: toF(d.high), low: toF(d.low) })),
    metrics: {
      ...m,
      wind: {
        ...m.wind,
        speed: Math.round(m.wind.speed * 0.621_371),
        gusts: Math.round(m.wind.gusts * 0.621_371),
      },
      humidity: { ...m.humidity, dewPoint: toF(m.humidity.dewPoint) },
      visibility: Math.round(m.visibility * 0.621_371),
      precipitation: {
        past24: round(m.precipitation.past24 / 25.4, true),
        next24: round(m.precipitation.next24 / 25.4, true),
        today: round(m.precipitation.today / 25.4, true),
        tomorrow: round(m.precipitation.tomorrow / 25.4, true),
      },
    },
  };
}

/**
 * The whole data layer: geocode the place name, pull the forecast and the air
 * quality, and flatten Open-Meteo's parallel arrays into one `Weather`.
 * Never throws — a failure returns the sample numbers with `stale: true`.
 */
export async function getWeather(
  place: Place,
  units: Settings["units"]
): Promise<Weather> {
  const unit: Weather["unit"] = units === "Fahrenheit" ? "F" : "C";
  // A Fahrenheit reader expects mph and inches too; half-converted looks broken.
  const imperial = unit === "F";
  const labels: Weather["units"] = imperial
    ? { wind: "mph", rain: "in", distance: "mi" }
    : { wind: "kph", rain: "mm", distance: "km" };

  try {
    const spot = await spotFor(place);

    const query =
      `latitude=${spot.latitude}&longitude=${spot.longitude}` +
      `&timezone=${encodeURIComponent(spot.timezone)}` +
      `&temperature_unit=${imperial ? "fahrenheit" : "celsius"}` +
      `&wind_speed_unit=${imperial ? "mph" : "kmh"}` +
      `&precipitation_unit=${imperial ? "inch" : "mm"}`;

    const [forecast, air] = await Promise.all([
      get<ForecastResponse>(
        `${FORECAST}?${query}&current=${CURRENT_FIELDS}` +
          `&hourly=${HOURLY_FIELDS}&daily=${DAILY_FIELDS}` +
          `&minutely_15=${MINUTELY_FIELDS}&forecast_minutely_15=${STEPS + 1}` +
          `&forecast_days=10&past_days=1`
      ),
      // Its own host, and the least important tile on the page: let it fail.
      get<AirResponse>(
        `${AIR}?${query}&current=us_aqi&hourly=us_aqi&past_days=1&forecast_days=1`
      ).catch(() => null),
    ]);

    const { current, hourly, daily } = forecast;
    const isDay = current.is_day === 1;
    const code = current.weather_code;

    // Hourly arrays start at midnight of day one; slice the 24 from this hour.
    const from = Math.max(
      0,
      hourly.time.findIndex((t) => t.slice(0, 13) === current.time.slice(0, 13))
    );
    const hours: Hour[] = hourly.time
      .slice(from, from + 24)
      .map((time, i) => ({
        time,
        temp: Math.round(hourly.temperature_2m[from + i]),
        code: hourly.weather_code[from + i],
        isDay: hourly.is_day[from + i] === 1,
        pop: hourly.precipitation_probability[from + i],
      }));

    const label = labelFor(code, isDay);

    // `past_days=1` prepends yesterday to the daily arrays, so nothing can
    // assume index 0 is today.
    const dayOffset = Math.max(
      daily.time.findIndex((d) => d === current.time.slice(0, 10)),
      0
    );

    const sum = (values: (number | null)[]) =>
      Math.round(values.reduce<number>((a, b) => a + (b ?? 0), 0) * 100) / 100;
    const past24 = sum(hourly.precipitation.slice(Math.max(from - 24, 0), from));
    const next24 = sum(hourly.precipitation.slice(from, from + 24));

    // The same hour yesterday is exactly 24 samples back in the AQI series.
    let aqiChange: number | null = null;
    if (air?.hourly) {
      const nowIndex = air.hourly.time.findIndex(
        (t) => t.slice(0, 13) === current.time.slice(0, 13)
      );
      const before = nowIndex >= 24 ? air.hourly.us_aqi[nowIndex - 24] : null;
      if (before != null) aqiChange = Math.round(air.current.us_aqi - before);
    }

    return {
      place: spot.name,
      coords: { lat: spot.latitude, lon: spot.longitude },
      unit,
      units: labels,
      now: {
        time: current.time,
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        code,
        isDay,
        label,
        high: Math.round(daily.temperature_2m_max[dayOffset]),
        low: Math.round(daily.temperature_2m_min[dayOffset]),
        summary: summarize(hours, label),
      },
      hourly: hours,
      daily: daily.time.slice(dayOffset).map((date, i) => ({
        date,
        code: daily.weather_code[dayOffset + i],
        high: Math.round(daily.temperature_2m_max[dayOffset + i]),
        low: Math.round(daily.temperature_2m_min[dayOffset + i]),
        pop: daily.precipitation_probability_max[dayOffset + i],
      })),
      metrics: {
        aqi: air
          ? {
              value: Math.round(air.current.us_aqi),
              label: aqiLabel(air.current.us_aqi),
              change: aqiChange,
            }
          : null,
        wind: {
          speed: Math.round(current.wind_speed_10m),
          gusts: Math.round(current.wind_gusts_10m),
          direction: current.wind_direction_10m,
          compass: compassFor(current.wind_direction_10m),
        },
        uv: {
          value: Math.round(daily.uv_index_max[dayOffset]),
          label: uvLabel(daily.uv_index_max[dayOffset]),
          window: uvWindow(hourly, current.time.slice(0, 10)),
        },
        sun: {
          sunrise: daily.sunrise[dayOffset].slice(11, 16),
          sunset: daily.sunset[dayOffset].slice(11, 16),
        },
        humidity: {
          value: current.relative_humidity_2m,
          dewPoint: Math.round(current.dew_point_2m),
        },
        // Open-Meteo reports visibility in metres regardless of the unit
        // settings above, so miles convert from metres, not feet.
        visibility: Math.round(current.visibility / (imperial ? 1609.34 : 1000)),
        pressure: Math.round(current.pressure_msl),
        precipitation: {
          past24,
          next24,
          // Inches need a second decimal to say anything at all.
          today: round(daily.precipitation_sum[dayOffset], imperial),
          tomorrow: round(daily.precipitation_sum[dayOffset + 1], imperial),
        },
        moon: moonFor(new Date(`${daily.time[dayOffset]}T12:00:00Z`)),
      },
      // Snow or rain is the forecast's call, not the temperature's: sleet at
      // 2°C is still not snow, and the codes already say which it is.
      nowcast: forecast.minutely_15
        ? nowcastFrom({
            times: forecast.minutely_15.time,
            precipitation: forecast.minutely_15.precipitation,
            now: current.time,
            frozen: (code >= 71 && code <= 77) || code === 85 || code === 86,
          })
        : null,
      stale: false,
    };
  } catch (error) {
    console.error("[weather] falling back to sample data:", error);
    return {
      ...toUnits(FALLBACK_WEATHER, imperial),
      place: typeof place === "string" ? place : "Current location",
      unit,
      units: labels,
    };
  }
}

/**
 * The average high for this date over the last five years, for the Averages
 * widget. Its own function because the archive request is slow (~1s) and
 * heavy: the page streams without it and fills the tile in when it lands.
 */
export async function getNormalHigh(
  place: Place,
  units: Settings["units"]
): Promise<number | null> {
  try {
    const spot = await spotFor(place);
    const year = new Date().getUTCFullYear();
    const data = await get<{
      daily: { time: string[]; temperature_2m_max: (number | null)[] };
    }>(
      `${ARCHIVE}?latitude=${spot.latitude}&longitude=${spot.longitude}` +
        `&start_date=${year - 5}-01-01&end_date=${year - 1}-12-31` +
        `&daily=temperature_2m_max&timezone=auto` +
        `&temperature_unit=${units === "Fahrenheit" ? "fahrenheit" : "celsius"}`,
      undefined,
      // Climate normals move on a scale of decades; one day of cache is plenty.
      86_400
    );

    // Same calendar day give or take three, across every year returned.
    const today = new Date();
    const window = new Set(
      [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    );

    const samples = data.daily.time
      .map((date, i) => [date.slice(5), data.daily.temperature_2m_max[i]] as const)
      .filter(([day, value]) => window.has(day) && value != null)
      .map(([, value]) => value as number);

    if (samples.length < 10) return null;
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  } catch {
    return null;
  }
}


/**
 * The place a server page should render: URL parameters when a link carries
 * them, otherwise the reader's saved location from the cookie, otherwise the
 * seed city.
 *
 * One function so the two pages cannot resolve it differently — Today reading
 * the cookie while `/weather` read its parameters was how the same screen came
 * to show two cities.
 */
export async function currentPlace(
  params?: Record<string, string | string[] | undefined>
) {
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).get(PLACE_COOKIE)?.value ?? "";
  const fromLink = Boolean(params?.place || (params?.lat && params?.lon));
  return placeFrom(fromLink ? params! : cookie, DEFAULT_PLACE);
}
