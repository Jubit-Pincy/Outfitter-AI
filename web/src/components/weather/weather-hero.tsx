import { NowcastLine } from "@/components/today/nowcast-line";
import { WeatherScene } from "@/components/today/weather-scene";
import type { Weather } from "@/lib/weather";

/** Place, temperature, condition, range — centred over the page's own sky. */
export function WeatherHero({ weather }: { weather: Weather }) {
  const { now } = weather;

  return (
    <section className="relative overflow-hidden rounded-2xl px-6 py-9 text-center text-[#EFEFEA] sm:px-10 sm:py-12">
      <WeatherScene
        priority
        scrim="center"
        blurVideo
        code={now.code}
        isDay={now.isDay}
        illumination={weather.metrics.moon.illumination}
        windDirection={weather.metrics.wind.direction}
        pop={weather.hourly[0]?.pop}
      />
      <div className="relative z-10">
      <h1 className="text-[30px] leading-tight font-normal tracking-[-0.01em] sm:text-[34px]">
        {weather.place.split(",")[0]}
      </h1>
      <p className="mt-1 text-[86px] leading-[0.92] font-light tracking-[-0.04em] sm:text-[104px]">
        {now.temp}°
      </p>
      <p className="mt-1 text-[19px] font-normal opacity-85">{now.label}</p>
      <p className="mt-0.5 text-[16px] font-medium opacity-90">
        H:{now.high}° L:{now.low}°
      </p>
      {weather.nowcast && (
        <NowcastLine
          nowcast={weather.nowcast}
          className="mt-2.5 inline-flex rounded-full bg-black/30 px-3 py-1 text-[14px] backdrop-blur-sm"
        />
      )}
      </div>
    </section>
  );
}
