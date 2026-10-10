import { cn } from "cn";
import { iconFor } from "@/lib/weather-codes";
import { hourLabel } from "@/lib/time";
import type { Weather } from "@/lib/weather";
import { Panel } from "@/components/ui/panel";
import { Scroller } from "@/components/ui/scroller";

/**
 * The next 24 hours, under the day's summary line. Sunrise and sunset are
 * spliced in at the hour they fall on, the way the system strip reads.
 */
function cells(weather: Weather) {
  const { sunrise, sunset } = weather.metrics.sun;
  const out: {
    key: string;
    label: string;
    temp?: string;
    pop?: number;
    code?: number;
    isDay?: boolean;
    sun?: "rise" | "set";
  }[] = [];

  weather.hourly.forEach((hour, i) => {
    out.push({
      key: hour.time,
      label: i === 0 ? "Now" : hourLabel(hour.time),
      temp: `${hour.temp}°`,
      pop: hour.pop,
      code: hour.code,
      isDay: hour.isDay,
    });
    for (const [time, kind] of [
      [sunrise, "rise"],
      [sunset, "set"],
    ] as const) {
      if (hourLabel(hour.time) === time.slice(0, 2) && i > 0) {
        out.push({ key: `${hour.time}-${kind}`, label: time, sun: kind });
      }
    }
  });

  return out;
}

export function HourlyStrip({ weather }: { weather: Weather }) {
  return (
    <Panel className="pb-3">
      <p className="px-5 py-3.5 text-[13.5px] text-ink-soft">
        {weather.now.summary} Wind gusts are up to {weather.metrics.wind.gusts}{" "}
        {weather.units.wind}.
      </p>
      <div className="border-t border-linen-2 px-2 pt-3">
        <Scroller
          tabIndex={0}
          role="group"
          aria-label="Hourly forecast"
          className="flex gap-1 px-1 pb-1 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {cells(weather).map((cell) => {
            const Icon =
              cell.code === undefined
                ? null
                : iconFor(cell.code, cell.isDay ?? true);
            const now = cell.label === "Now";
            const showPop = cell.pop != null && cell.pop >= 25;
            return (
              <div
                key={cell.key}
                className={cn(
                  "flex w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-xl py-1.5",
                  now && "bg-linen"
                )}
              >
                <span
                  className={cn(
                    "text-[13px] tabular-nums",
                    now ? "font-semibold text-ink" : "text-ink-soft"
                  )}
                >
                  {cell.label}
                </span>
                {Icon ? (
                  <Icon
                    className="size-[21px] text-ink-soft"
                    strokeWidth={1.5}
                  />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      "size-[21px] rounded-full",
                      cell.sun === "rise" ? "bg-ochre" : "bg-fern"
                    )}
                  />
                )}
                {/* Rain chance sits under the icon, as on the reference. */}
                <span
                  className={cn(
                    "text-[11px] leading-none font-semibold tabular-nums",
                    showPop ? "text-fern" : "invisible"
                  )}
                >
                  {showPop ? `${cell.pop}%` : "0%"}
                </span>
                <span className="text-[14px] font-medium tabular-nums">
                  {cell.temp ?? (cell.sun === "rise" ? "Sunrise" : "Sunset")}
                </span>
              </div>
            );
          })}
        </Scroller>
      </div>
    </Panel>
  );
}
