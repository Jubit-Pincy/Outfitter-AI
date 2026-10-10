import {
  Droplets,
  Eye,
  Gauge,
  Moon,
  Sun,
  Sunrise,
  Thermometer,
  TrendingUp,
  Umbrella,
  Wind as WindIcon,
} from "lucide-react";
import { MetricTile, ScaleBar, SCALE, TileValue } from "./metric-tile";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { toMinutes } from "@/lib/time";
import type { Weather } from "@/lib/weather";

/** A label/value line, the way the wind and moon widgets list their figures. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linen-2 py-2.5 last:border-0">
      <span className="text-[13.5px] text-ink-soft">{label}</span>
      <span className="text-[13.5px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

/** Air quality: index, band, and its place on the scale. */
export function AirQuality({ weather }: { weather: Weather }) {
  const aqi = weather.metrics.aqi;
  if (!aqi) return null;
  return (
    <Panel className="flex flex-col px-5 py-4">
      <PanelTitle icon={WindIcon}>Air quality</PanelTitle>
      <TileValue>{aqi.value}</TileValue>
      <p className="mt-1 text-[14px] font-medium">{aqi.label}</p>
      <ScaleBar at={aqi.value / 300} from={SCALE} />
      <p className="mt-3 text-[12.5px] leading-[1.45] text-ink-soft">
        {aqi.change == null
          ? `Air quality index is ${aqi.value} on the US scale.`
          : Math.abs(aqi.change) <= 5
            ? `Air quality index is ${aqi.value}, which is similar to yesterday at about this time.`
            : `Air quality index is ${aqi.value}, ${Math.abs(aqi.change)} points ${aqi.change > 0 ? "worse" : "better"} than yesterday.`}
      </p>
    </Panel>
  );
}

/** Wind: three figures on the left, a compass on the right. */
export function Wind({ weather }: { weather: Weather }) {
  const { wind } = weather.metrics;
  const unit = weather.units.wind;
  return (
    <Panel className="px-5 py-4">
      <PanelTitle icon={WindIcon}>Wind</PanelTitle>
      <div className="mt-1 flex items-center gap-5">
        <div className="min-w-0 flex-1">
          <Row label="Wind" value={`${wind.speed} ${unit}`} />
          <Row label="Gusts" value={`${wind.gusts} ${unit}`} />
          <Row label="Direction" value={`${wind.direction}° ${wind.compass}`} />
        </div>
        <svg viewBox="0 0 96 96" className="size-[104px] shrink-0" aria-hidden>
          {/* Ticks all the way round, as on the reference dial. */}
          {Array.from({ length: 36 }, (_, i) => (
            <line
              key={i}
              x1="48"
              y1="8"
              x2="48"
              y2={i % 9 === 0 ? 15 : 12}
              stroke="var(--linen-2)"
              strokeWidth="1.2"
              transform={`rotate(${i * 10} 48 48)`}
            />
          ))}
          {["N", "E", "S", "W"].map((point, i) => (
            <text
              key={point}
              x={48 + 27 * Math.sin((i * Math.PI) / 2)}
              y={48 - 27 * Math.cos((i * Math.PI) / 2) + 3.5}
              textAnchor="middle"
              fontSize="8.5"
              fill="var(--ink-soft)"
            >
              {point}
            </text>
          ))}
          <g transform={`rotate(${wind.direction} 48 48)`}>
            <path d="M48 16 L52 29 L48 26 L44 29 Z" fill="var(--ink)" />
            <path d="M48 80 L44 67 L48 70 L52 67 Z" fill="var(--linen-2)" />
          </g>
          <text
            x="48"
            y="46"
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            fill="var(--ink)"
          >
            {wind.speed}
          </text>
          <text
            x="48"
            y="57"
            textAnchor="middle"
            fontSize="8"
            fill="var(--ink-soft)"
          >
            {unit}
          </text>
        </svg>
      </div>
    </Panel>
  );
}

/** UV index, with the hours worth protecting against. */
export function Uv({ weather }: { weather: Weather }) {
  const { uv } = weather.metrics;
  return (
    <MetricTile
      icon={Sun}
      label="UV index"
      value={String(uv.value)}
      note={
        uv.window
          ? `Use sun protection ${uv.window}.`
          : "No protection needed today."
      }
    >
      <p className="mt-1 text-[14px] font-medium">{uv.label}</p>
      <ScaleBar at={uv.value / 11} from={SCALE} />
    </MetricTile>
  );
}

/** Sunrise, with the sun's position along the day's arc. */
export function SunTile({ weather }: { weather: Weather }) {
  const { sun } = weather.metrics;
  const rise = toMinutes(sun.sunrise);
  const set = toMinutes(sun.sunset);
  const now = toMinutes(weather.now.time.slice(11, 16));
  const progress = Math.min(Math.max((now - rise) / (set - rise), 0), 1);
  const angle = Math.PI * progress;

  return (
    <MetricTile
      icon={Sunrise}
      label="Sunrise"
      value={sun.sunrise}
      note={`Sunset: ${sun.sunset}`}
    >
      <svg viewBox="0 0 100 44" className="mt-3 w-full" aria-hidden>
        <path
          d="M6 38 A44 30 0 0 1 94 38"
          fill="none"
          stroke="var(--linen-2)"
          strokeWidth="1.6"
        />
        <line
          x1="0"
          y1="38"
          x2="100"
          y2="38"
          stroke="var(--stitch)"
          strokeWidth="1"
        />
        <circle
          cx={50 - 44 * Math.cos(angle)}
          cy={38 - 30 * Math.sin(angle)}
          r="4"
          fill="var(--ochre)"
        />
      </svg>
    </MetricTile>
  );
}

/** Feels like, against the real temperature. */
export function FeelsLike({ weather }: { weather: Weather }) {
  const { temp, feelsLike } = weather.now;
  return (
    <MetricTile
      icon={Thermometer}
      label="Feels like"
      value={`${feelsLike}°`}
      note={
        feelsLike === temp
          ? "Similar to the actual temperature."
          : feelsLike > temp
            ? "It feels warmer than the actual temperature."
            : "Wind is making it feel cooler than the actual temperature."
      }
    />
  );
}

/** Rainfall over the rolling 24 hours behind and ahead. */
export function Precipitation({ weather }: { weather: Weather }) {
  const { precipitation } = weather.metrics;
  const unit = weather.units.rain;
  return (
    <MetricTile
      icon={Umbrella}
      label="Precipitation"
      value={`${precipitation.past24} ${unit}`}
      note={`${precipitation.next24} ${unit} expected in next 24h.`}
    >
      <p className="mt-1 text-[14px] font-medium">In last 24h</p>
    </MetricTile>
  );
}

export function Humidity({ weather }: { weather: Weather }) {
  const { humidity } = weather.metrics;
  return (
    <MetricTile
      icon={Droplets}
      label="Humidity"
      value={`${humidity.value}%`}
      note={`The dew point is ${humidity.dewPoint}° right now.`}
    />
  );
}

export function Visibility({ weather }: { weather: Weather }) {
  const { visibility } = weather.metrics;
  const clear = visibility >= (weather.unit === "F" ? 9 : 15);
  return (
    <MetricTile
      icon={Eye}
      label="Visibility"
      value={`${visibility} ${weather.units.distance}`}
      note={clear ? "Perfectly clear view." : "Hazy in the distance."}
    />
  );
}

/** Pressure on a dial, with the needle at the reading. */
export function Pressure({ weather }: { weather: Weather }) {
  const { pressure } = weather.metrics;
  // 970-1050 hPa covers everything short of a hurricane.
  const fraction = Math.min(Math.max((pressure - 970) / 80, 0), 1);
  const sweep = 250;
  const needle = -125 + fraction * sweep;

  return (
    <Panel className="flex flex-col px-5 py-4">
      <PanelTitle icon={Gauge}>Pressure</PanelTitle>
      <div className="mt-2 grid flex-1 place-items-center">
        <svg viewBox="0 0 100 82" className="w-[112px]" aria-hidden>
          {Array.from({ length: 41 }, (_, i) => {
            const angle = -125 + (i / 40) * sweep;
            const major = i % 10 === 0;
            return (
              <line
                key={i}
                x1="50"
                y1="8"
                x2="50"
                y2={major ? 15 : 12}
                stroke="var(--stitch)"
                strokeWidth={major ? 1.6 : 1}
                transform={`rotate(${angle} 50 44)`}
              />
            );
          })}
          <line
            x1="50"
            y1="6"
            x2="50"
            y2="20"
            stroke="var(--ink)"
            strokeWidth="2.4"
            strokeLinecap="round"
            transform={`rotate(${needle} 50 44)`}
          />
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="var(--ink)"
          >
            {pressure.toLocaleString("en-GB")}
          </text>
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fontSize="8.5"
            fill="var(--ink-soft)"
          >
            hPa
          </text>
        </svg>
      </div>
      <div className="flex justify-between text-[11.5px] text-ink-soft">
        <span>Low</span>
        <span>High</span>
      </div>
    </Panel>
  );
}

/** The moon: its phase, how lit it is, and when the next full one lands. */
export function MoonTile({ weather }: { weather: Weather }) {
  const { moon } = weather.metrics;
  const days = Math.round(moon.daysToFull);
  return (
    <Panel className="px-5 py-4">
      <PanelTitle icon={Moon}>{moon.phase}</PanelTitle>
      <div className="mt-1 flex items-center gap-5">
        <div className="min-w-0 flex-1">
          <Row label="Illumination" value={`${moon.illumination}%`} />
          <Row
            label="Next full moon"
            value={days === 0 ? "Tonight" : `${days} days`}
          />
        </div>
        <svg viewBox="0 0 80 80" className="size-[92px] shrink-0" aria-hidden>
          <defs>
            <clipPath id="moon-face">
              <circle cx="40" cy="40" r="33" />
            </clipPath>
            <radialGradient id="moon-lit" cx="38%" cy="34%" r="72%">
              <stop offset="0%" stopColor="#f4f4ef" />
              <stop offset="100%" stopColor="#c3c6cc" />
            </radialGradient>
          </defs>
          <circle cx="40" cy="40" r="33" fill="url(#moon-lit)" />
          {/* Craters, so it reads as the moon and not a disc. */}
          <g clipPath="url(#moon-face)" fill="rgba(90,97,103,0.22)">
            <circle cx="30" cy="30" r="7" />
            <circle cx="52" cy="26" r="4.5" />
            <circle cx="46" cy="50" r="9" />
            <circle cx="26" cy="52" r="5" />
            <circle cx="60" cy="44" r="3.5" />
          </g>
          {/* The shadow slides off as illumination grows. It stays slightly
              transparent so a new moon still reads as a cratered disc rather
              than a hole, the way the reference renders it. */}
          {/* The shadow leaves to the right while waxing and to the left while
              waning, so a last-quarter moon no longer draws as a first. */}
          <circle
            cx={
              moon.waxing
                ? 40 + (moon.illumination / 100) * 70
                : 40 - (moon.illumination / 100) * 70
            }
            cy="40"
            r="33"
            fill="#2b2420"
            fillOpacity={0.82}
            clipPath="url(#moon-face)"
          />
          <circle
            cx="40"
            cy="40"
            r="33"
            fill="none"
            stroke="var(--linen-2)"
            strokeWidth="1"
          />
        </svg>
      </div>
    </Panel>
  );
}

/** Today against the average for the date. */
export function Averages({
  weather,
  normal,
}: {
  weather: Weather;
  normal: number;
}) {
  const delta = weather.now.high - normal;
  return (
    <Panel className="flex flex-col px-5 py-4">
      <PanelTitle icon={TrendingUp}>Averages</PanelTitle>
      <TileValue>
        {delta >= 0 ? "+" : "−"}
        {Math.abs(delta)}°
      </TileValue>
      <p className="mt-1 text-[14px] leading-[1.25] font-medium">
        {delta === 0 ? "average daily high" : delta > 0 ? "above average" : "below average"}
        <br />
        {delta === 0 ? "" : "daily high"}
      </p>
      <div className="mt-auto pt-3 text-[12.5px] text-ink-soft">
        <div className="flex justify-between">
          <span>Today</span>
          <span className="font-medium text-ink tabular-nums">
            H:{weather.now.high}°
          </span>
        </div>
        <div className="flex justify-between">
          <span>Average</span>
          <span className="font-medium tabular-nums">H:{normal}°</span>
        </div>
      </div>
    </Panel>
  );
}
