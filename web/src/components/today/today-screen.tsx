"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DayTimeline } from "./day-timeline";
import { OutfitCard } from "./outfit-card";
import { WeatherCard } from "./weather-card";
import { KindIcon } from "@/components/kind-icon";
import { LEDE } from "@/data/weather";
import type { Weather } from "@/lib/weather";
import { dateLine } from "@/lib/time";
import { stagger } from "@/lib/motion";
import { usePicks } from "@/hooks/use-picks";

/** The date only changes with the clock; nothing to subscribe to. */
const subscribeNothing = () => () => {};

export function TodayScreen({ weather, today }: { weather: Weather; today: string }) {
  const { picks, loading, error } = usePicks(weather);

  // The server renders in its own timezone, which is the wrong day either side
  // of midnight for most readers. The server value is the hydration snapshot;
  // the client recomputes it in the reader's own zone.
  const date = useSyncExternalStore(subscribeNothing, () => dateLine(), () => today);

  return (
    <>
      <PageHeader title={date} lede={LEDE} />

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <WeatherCard weather={weather} />
        <DayTimeline />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-[14.5px] text-destructive"
        >
          {error}
        </p>
      ) : null}

      {loading && !picks ? (
        <p className="flex items-center gap-2.5 py-10 text-[14.5px] text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Reading your wardrobe against the forecast
        </p>
      ) : null}

      {/* One block per thing on the day: the engine scores each occasion on
          its own weather, so 09:30 at the office and 18:30 at the gym are two
          different questions with two different answers. */}
      {picks?.map((pick) => (
        <section key={pick.slotId ?? pick.kind} className="mb-9 last:mb-0">
          <header className="mb-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="flex items-center gap-2 font-heading text-[19px] font-semibold text-ink">
              <KindIcon kind={pick.kind} className="size-[17px] text-ink-soft" />
              {pick.kind}
            </h2>
            <span className="text-[13.5px] text-ink-soft">
              {pick.time} · {Math.round(pick.weather.temp)}°C
              {pick.weather.rainProbability >= 20
                ? ` · ${Math.round(pick.weather.rainProbability)}% rain`
                : null}
            </span>
            {/* What the engine had to work with, so the answer is checkable. */}
            <span className="ml-auto text-[12.5px] text-ink-soft tabular-nums">
              {pick.considered} pieces fit · {pick.combosBuilt.toLocaleString()} outfits weighed
            </span>
          </header>

          {pick.outfits.length ? (
            <motion.div
              variants={stagger()}
              initial="hidden"
              animate="show"
              className="grid gap-5 md:grid-cols-2"
            >
              {pick.outfits.map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} pick={pick} />
              ))}
            </motion.div>
          ) : (
            <p className="rounded-2xl bg-paper px-5 py-6 text-[14.5px] text-ink-soft">
              Nothing in the wardrobe suits {pick.kind.toLowerCase()} at{" "}
              {Math.round(pick.weather.temp)}°C yet.{" "}
              <Link href="/wardrobe" className="text-fern underline underline-offset-[3px]">
                Add a piece
              </Link>{" "}
              or loosen the rest period in Settings.
            </p>
          )}
        </section>
      ))}
    </>
  );
}
