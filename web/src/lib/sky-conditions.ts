/**
 * The conditions the forecast can actually name, each with its own footage.
 *
 * `weather-codes.ts` collapses Open-Meteo's WMO codes into six painted skies,
 * which is right for a drawn scene — cloud density is a dial there. Film is
 * not a dial: fog looks nothing like overcast, and a partly cloudy sky is the
 * opposite of a flat grey one. So the lab keeps every label the forecast says
 * out loud, and pairs each with a day and a night clip.
 *
 * `max` mirrors the thresholds in `weather-codes.ts`, so a code lands on the
 * same condition as the label the reader is shown.
 */

export const CONDITIONS = [
  {
    key: "clear",
    label: "Clear",
    max: 0,
    photo: "/sky/clear-day.jpg",
    nightPhoto: "/sky/clear-night.jpg",
    temp: 61,
  },
  {
    key: "mostly-clear",
    label: "Mostly clear",
    max: 1,
    photo: "/sky/clear-day.jpg",
    nightPhoto: "/sky/clear-night.jpg",
    temp: 59,
  },
  {
    key: "partly-cloudy",
    label: "Partly cloudy",
    max: 2,
    photo: "/sky/cloudy.jpg",
    nightPhoto: "/sky/clear-night.jpg",
    temp: 57,
  },
  {
    key: "overcast",
    label: "Overcast",
    max: 3,
    photo: "/sky/cloudy.jpg",
    nightPhoto: "/sky/cloudy.jpg",
    temp: 54,
  },
  {
    key: "fog",
    label: "Fog",
    max: 48,
    photo: "/sky/cloudy.jpg",
    nightPhoto: "/sky/cloudy.jpg",
    temp: 46,
  },
  {
    key: "drizzle",
    label: "Drizzle",
    max: 57,
    photo: "/sky/rain.jpg",
    nightPhoto: "/sky/rain.jpg",
    temp: 51,
  },
  {
    key: "rain",
    label: "Rain",
    max: 67,
    photo: "/sky/rain.jpg",
    nightPhoto: "/sky/rain.jpg",
    temp: 49,
  },
  {
    key: "snow",
    label: "Snow",
    max: 77,
    photo: "/sky/rain.jpg",
    nightPhoto: "/sky/rain.jpg",
    temp: 28,
  },
  {
    key: "showers",
    label: "Showers",
    max: 82,
    photo: "/sky/rain.jpg",
    nightPhoto: "/sky/rain.jpg",
    temp: 52,
  },
  {
    key: "snow-showers",
    label: "Snow showers",
    max: 86,
    photo: "/sky/rain.jpg",
    nightPhoto: "/sky/rain.jpg",
    temp: 30,
  },
  {
    key: "thunderstorm",
    label: "Thunderstorms",
    max: 99,
    photo: "/sky/storm.jpg",
    nightPhoto: "/sky/storm.jpg",
    temp: 66,
  },
] as const;

export type Condition = (typeof CONDITIONS)[number];
export type ConditionKey = Condition["key"];

export const CONDITION_KEYS = CONDITIONS.map((c) => c.key);

export function isConditionKey(value: string): value is ConditionKey {
  return (CONDITION_KEYS as readonly string[]).includes(value);
}

/** The condition a forecast code belongs to. */
export function conditionFor(code: number): Condition {
  return CONDITIONS.find((c) => code <= c.max) ?? CONDITIONS[CONDITIONS.length - 1];
}
