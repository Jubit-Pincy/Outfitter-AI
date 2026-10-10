/**
 * The next two hours of precipitation, in the one sentence that changes what
 * you put on: "Rain starting in 20 minutes", "Rain stopping in 35 minutes".
 *
 * Open-Meteo's `minutely_15` gives precipitation in quarter-hour steps. That is
 * coarser than Apple's minute-by-minute radar nowcast, so the copy never claims
 * a precision it does not have — everything is rounded to five minutes and the
 * wording stays approximate.
 */

/** mm in a 15-minute step that counts as actually falling. */
const WET = 0.1;

/** Steps ahead to read: eight quarter-hours is the two hours we talk about. */
export const STEPS = 8;

export interface Nowcast {
  /**
   * `starting` — dry now, wet within the window.
   * `stopping` — wet now, dry within the window.
   * `continuing` — wet now and wet for the whole window.
   */
  state: "starting" | "stopping" | "continuing";
  /** Minutes until the change, rounded to five. Zero when it is imminent. */
  minutes: number;
  /** `rain` or `snow`, from the forecast's own condition. */
  kind: "rain" | "snow";
  /** Heaviest step in the window, for how emphatic the line should be. */
  intensity: "light" | "moderate" | "heavy";
  /** The sentence itself, ready to render. */
  text: string;
}

/** mm per 15-minute step, at the boundaries the WMO uses per hour. */
function intensityOf(mm: number): Nowcast["intensity"] {
  if (mm >= 1.9) return "heavy";
  if (mm >= 0.6) return "moderate";
  return "light";
}

/**
 * Open-Meteo returns naive local ISO strings (`2026-09-12T22:45`) for the
 * location's own timezone, and `current.time` is in that same clock. Comparing
 * the two as strings sidesteps the reader's timezone entirely — parsing them
 * as Dates would silently shift both into wherever the browser happens to be.
 */
function minutesBetween(from: string, to: string) {
  const at = (iso: string) => {
    const [date, clock] = iso.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = clock.split(":").map(Number);
    return Date.UTC(y, m - 1, d, hh, mm);
  };
  return Math.round((at(to) - at(from)) / 60_000);
}

/** Five-minute granularity, since a 15-minute model cannot justify more. */
const round5 = (minutes: number) => Math.max(0, Math.round(minutes / 5) * 5);

export function nowcastFrom({
  times,
  precipitation,
  now,
  frozen,
}: {
  /** Naive local ISO stamps, one per quarter hour. */
  times: string[];
  /** mm in each of those quarter hours. */
  precipitation: number[];
  /** `current.time`, in the same local clock. */
  now: string;
  /** True when the forecast says this falls as snow. */
  frozen: boolean;
}): Nowcast | null {
  // The array can open on the step already under way, or on one just behind
  // it; either way the first step that has not ended yet is where we start.
  const start = times.findIndex((t) => minutesBetween(now, t) > -15);
  if (start < 0) return null;

  const window = times
    .slice(start, start + STEPS)
    .map((time, i) => ({
      time,
      mm: precipitation[start + i] ?? 0,
      in: minutesBetween(now, time),
    }));
  if (!window.length) return null;

  const kind: Nowcast["kind"] = frozen ? "snow" : "rain";
  const noun = frozen ? "Snow" : "Rain";
  const wetNow = window[0].mm >= WET;
  const peak = Math.max(...window.map((step) => step.mm));

  if (!wetNow) {
    const onset = window.find((step) => step.mm >= WET);
    // A dry two hours is the common case, and it is not news.
    if (!onset) return null;
    const minutes = round5(onset.in);
    return {
      state: "starting",
      minutes,
      kind,
      intensity: intensityOf(peak),
      text: minutes <= 5 ? `${noun} starting` : `${noun} starting in ${minutes} min`,
    };
  }

  const clearing = window.find((step) => step.mm < WET);
  if (!clearing) {
    return {
      state: "continuing",
      minutes: STEPS * 15,
      kind,
      intensity: intensityOf(peak),
      text: `${noun} for the next couple of hours`,
    };
  }

  const minutes = round5(clearing.in);
  return {
    state: "stopping",
    minutes,
    kind,
    intensity: intensityOf(peak),
    text: minutes <= 5 ? `${noun} easing off` : `${noun} stopping in ${minutes} min`,
  };
}
