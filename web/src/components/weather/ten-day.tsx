import { CalendarDays } from "lucide-react";
import { iconFor } from "@/lib/weather-codes";
import { dayLabel } from "@/lib/time";
import type { Weather } from "@/lib/weather";
import { NowDot } from "./now-dot";
import { Panel, PanelTitle } from "@/components/ui/panel";

/**
 * Ten rows sharing one temperature axis, so each bar's position is comparable
 * across the whole card. Today's row also carries a dot at the current
 * temperature.
 */
export function TenDay({ weather }: { weather: Weather }) {
  const lows = weather.daily.map((d) => d.low);
  const highs = weather.daily.map((d) => d.high);
  const floor = Math.min(...lows);
  const span = Math.max(...highs) - floor || 1;
  // Clamped: a current temperature outside the ten-day range would otherwise
  // put the dot off the end of the rail.
  const at = (t: number) =>
    Math.min(Math.max(((t - floor) / span) * 100, 0), 100);

  return (
    <Panel className="px-5 py-4 sm:px-6">
      <PanelTitle icon={CalendarDays}>10-day forecast</PanelTitle>
      <ul className="mt-1">
        {weather.daily.map((day, i) => {
          const Icon = iconFor(day.code, true);
          return (
            <li
              key={day.date}
              className="flex items-center gap-3 border-b border-linen-2 py-2.5 last:border-0 sm:gap-4"
            >
              <span className="w-[52px] shrink-0 text-[15px] font-medium sm:w-[60px]">
                {dayLabel(day.date, i)}
              </span>
              <span className="flex w-[42px] shrink-0 flex-col items-center">
                <Icon className="size-[18px] text-ink-soft" strokeWidth={1.6} />
                {day.pop >= 25 && (
                  <span className="text-[10px] leading-tight font-semibold text-fern tabular-nums">
                    {day.pop}%
                  </span>
                )}
              </span>
              <span className="w-8 shrink-0 text-right text-[15px] text-ink-soft tabular-nums">
                {day.low}°
              </span>
              <span className="relative h-1.5 min-w-0 flex-1 rounded-full bg-linen-2">
                <span
                  className="absolute inset-y-0 rounded-full bg-linear-to-r from-sage via-ochre to-[#a3402e]"
                  style={{
                    left: `${at(day.low)}%`,
                    width: `${Math.max(at(day.high) - at(day.low), 4)}%`,
                  }}
                />
                {i === 0 && <NowDot at={at(weather.now.temp) / 100} />}
              </span>
              <span className="w-8 shrink-0 text-[15px] font-medium tabular-nums">
                {day.high}°
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
