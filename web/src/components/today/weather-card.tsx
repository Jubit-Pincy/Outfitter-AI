"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { NowcastLine } from "./nowcast-line";
import { WeatherScene } from "./weather-scene";
import { useOutfitter } from "@/lib/store";
import { weatherHref, type Weather } from "@/lib/weather";
import { skyCredit } from "@/lib/sky-credit";
import { skyClipFor } from "@/lib/sky-clip";

/**
 * The next four hours, as time and temperature.
 *
 * This replaced a bare sparkline. Seven unlabelled bars in a weather card read
 * as rain chance to everyone who saw them — they were temperature — and a
 * shape with no scale could not correct the guess. Numbers can.
 */
function NextHours({ weather }: { weather: Weather }) {
  // Hour zero is the current hour, which the big temperature already shows.
  const hours = weather.hourly.slice(1, 5);

  return (
    <div className="flex shrink-0 gap-3.5 sm:gap-4" aria-hidden>
      {hours.map((hour) => (
        <div key={hour.time} className="flex flex-col items-center gap-1">
          <span className="text-[11px] tabular-nums opacity-70">
            {hour.time.slice(11, 16)}
          </span>
          <span className="text-[15px] font-medium tabular-nums">
            {hour.temp}°
          </span>
        </div>
      ))}
    </div>
  );
}

export function WeatherCard({ weather }: { weather: Weather }) {
  const { now, unit, nowcast } = weather;
  // The figures above are the server's, for the seed location. The store knows
  // the location the user actually picked, so the link carries that and the
  // full screen fetches it — again on the server.
  const settings = useOutfitter((s) => s.settings);
  const hours = weather.hourly.slice(1, 5);
  // Whoever's work is actually on screen. A pinned clip supplies both the
  // moving footage and the still under it, so the photograph — CC BY-SA, and
  // credited wherever it appears — only shows when there is no clip.
  const clip = skyClipFor(now.code, now.isDay);
  const credit = clip ? clip.author : skyCredit(now.code, now.isDay).author;

  return (
    <Link
      href={weatherHref(settings)}
      className="group relative flex flex-col justify-center gap-3 overflow-hidden rounded-2xl px-6 py-5 text-[#EFEFEA] transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-linen focus-visible:outline-none"
    >
      <WeatherScene
        priority
        // Softened, so the temperature stays the thing you read first — but
        // not so far that the sky stops being recognisable weather.
        blurVideo
        code={now.code}
        isDay={now.isDay}
        illumination={weather.metrics.moon.illumination}
        windDirection={weather.metrics.wind.direction}
        pop={weather.hourly[0]?.pop}
      />

      {/* Condition and temperature, on one baseline. */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="text-[52px] leading-[0.9] font-semibold tracking-[-0.035em]">
          {now.temp}°
        </div>
        <div className="min-w-0">
          <div className="text-[15.5px] font-medium">{now.label}</div>
          <div className="text-[13px] opacity-80">
            Feels like {now.feelsLike}° · H:{now.high}° L:{now.low}°
          </div>
        </div>
      </div>

      {/* The line that changes what you put on gets its own row, wide enough
          not to wrap on a phone. It only appears when rain or snow is inside
          the next two hours. */}
      {nowcast && (
        <NowcastLine nowcast={nowcast} className="relative z-10 text-[13.5px]" />
      )}

      <div className="relative z-10 flex items-end justify-between gap-4">
        <span className="flex items-center gap-1 text-[13px] opacity-80">
          Full forecast
          <ChevronRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </span>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <NextHours weather={weather} />
        </motion.div>
      </div>

      <span className="absolute right-2 bottom-1 z-10 text-[9px] text-white/35">
        {credit}
      </span>

      <span className="sr-only">
        {unit === "F" ? "Fahrenheit" : "Celsius"}.{" "}
        {hours
          .map((hour) => `${hour.time.slice(11, 16)}, ${hour.temp} degrees`)
          .join(". ")}
        . Open the full forecast for {settings.location}.
      </span>
    </Link>
  );
}
