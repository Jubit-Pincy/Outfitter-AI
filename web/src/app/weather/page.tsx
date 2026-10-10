import { Suspense } from "react";
import { AutoRefresh } from "@/components/shell/auto-refresh";
import { HourlyStrip } from "@/components/weather/hourly-strip";
import { NormalHigh, NormalHighSkeleton } from "@/components/weather/normal-high";
import { TenDay } from "@/components/weather/ten-day";
import { PlaceSync } from "@/components/weather/place-sync";
import { WeatherHero } from "@/components/weather/weather-hero";
import {
  AirQuality,
  FeelsLike,
  Humidity,
  MoonTile,
  Precipitation,
  Pressure,
  SunTile,
  Uv,
  Visibility,
  Wind,
} from "@/components/weather/widgets";
import { currentPlace, getWeather } from "@/lib/weather";
import { skyCredit } from "@/lib/sky-credit";
import { skyClipFor } from "@/lib/sky-clip";

export const metadata = { title: "Weather" };

/**
 * The full forecast, fetched and rendered on the server. `?place=` (or
 * `?lat=&lon=`) comes from the Today card's link, which knows the location
 * held in the client store.
 *
 * The grid follows the system weather app: a wide left column for the ten-day
 * list and the moon, and a four-across field of widgets beside it. The sky
 * lives inside the hero panel, so the page keeps the app's linen ground.
 */
export default async function WeatherPage(props: PageProps<"/weather">) {
  // Shared with Today: parameters when the link carries a city, the saved
  // location otherwise.
  const { place, units } = await currentPlace(await props.searchParams);
  const weather = await getWeather(place, units);
  const sky = skyCredit(weather.now.code, weather.now.isDay);
  // Where a clip is pinned it supplies the still as well as the motion, so the
  // photograph is not on screen at all and naming it would be a credit for
  // something nobody is looking at.
  const clip = skyClipFor(weather.now.code, weather.now.isDay);

  return (
    <>
      <AutoRefresh />
      {/* The header and Today read the store; this page reads the URL. Without
          this they can name two different cities on one screen. */}
      <PlaceSync
        place={weather.place}
        coords={weather.coords}
        units={units}
      />
      <WeatherHero weather={weather} />
      <div className="mt-4">
        <HourlyStrip weather={weather} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,2fr)] lg:items-start">
        <div className="grid gap-4">
          <TenDay weather={weather} />
          <MoonTile weather={weather} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <AirQuality weather={weather} />
          </div>
          <div className="sm:col-span-2">
            <Wind weather={weather} />
          </div>

          <Uv weather={weather} />
          <SunTile weather={weather} />
          <FeelsLike weather={weather} />
          <Precipitation weather={weather} />

          <Humidity weather={weather} />
          <Visibility weather={weather} />
          <Pressure weather={weather} />
          <Suspense fallback={<NormalHighSkeleton />}>
            <NormalHigh place={place} units={units} weather={weather} />
          </Suspense>
        </div>
      </div>

      <p className="mt-4 text-center text-[11.5px] text-ink-soft">
        {clip ? (
          <>
            Sky footage by{" "}
            <a
              href={clip.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {clip.author}
            </a>{" "}
            · Pixabay
          </>
        ) : (
          <>
            Sky photograph by {sky.author} · {sky.license} ·{" "}
            <a
              href={sky.source}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Wikimedia Commons
            </a>
          </>
        )}
      </p>

      {weather.stale && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          Showing sample weather — couldn&apos;t reach the forecast service.
        </p>
      )}
    </>
  );
}
