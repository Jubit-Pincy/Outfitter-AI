"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import { useOutfitter } from "@/lib/store";
import { toMinutes } from "@/lib/time";
import type { Weather } from "@/lib/weather";
import type { Pick, Slot } from "@/lib/types";

/**
 * Today's outfits, from the engine.
 *
 * The choosing used to happen here in TypeScript, against a seeded wardrobe.
 * It now happens in `api/outfitter/scoring.py` — the notebook's own maths —
 * and this hook is the errand: send the day and the weather, hold what comes
 * back.
 *
 * The weather is sent rather than fetched again on the Python side so the
 * reason printed under an outfit is the same forecast the sky above it was
 * painted from.
 */

/** The hour of the forecast nearest a slot's time, so 18:30 is not scored at 09:00. */
function weatherAt(weather: Weather, time: string) {
  const wanted = toMinutes(time);
  let best = weather.hourly[0];
  let bestGap = Infinity;
  for (const hour of weather.hourly) {
    const at = new Date(hour.time);
    const gap = Math.abs(at.getHours() * 60 + at.getMinutes() - wanted);
    if (gap < bestGap) {
      bestGap = gap;
      best = hour;
    }
  }
  const temp = best?.temp ?? weather.now.temp;
  return {
    // The engine works in Celsius; the app may be showing Fahrenheit.
    temp: weather.unit === "F" ? ((temp - 32) * 5) / 9 : temp,
    rainProbability: best?.pop ?? weather.hourly[0]?.pop ?? 0,
  };
}

/** A day with nothing on it still deserves an answer. */
const FALLBACK_SLOT: Slot = { id: "today", time: "09:00", kind: "Casual" };

interface Answer {
  /** The question this answers, so a stale one can be told apart from a fresh one. */
  signature: string;
  picks: Pick[] | null;
  error: string | null;
}

export function usePicks(weather: Weather) {
  const schedule = useOutfitter((s) => s.schedule);
  const items = useOutfitter((s) => s.items);
  const restDays = useOutfitter((s) => s.settings.restDays);
  const formalityMap = useOutfitter((s) => s.settings.formalityMap);
  const status = useOutfitter((s) => s.status);

  const occasions = useMemo(() => {
    const slots = schedule.length ? schedule : [FALLBACK_SLOT];
    return slots.map((slot) => ({
      id: slot.id,
      kind: slot.kind,
      time: slot.time,
      // What this kind of slot is meant to be dressed for, as Settings says.
      formality: formalityMap[slot.kind],
      ...weatherAt(weather, slot.time),
    }));
  }, [schedule, weather, formalityMap]);

  /**
   * What the engine is being asked. Adding, removing or retagging a piece
   * changes the question and the picks are fetched again.
   *
   * `lastWorn` is deliberately not in here. It does change what the engine
   * would answer — that is the rest period doing its job — but re-asking the
   * moment someone presses "Wear this" replaces the outfit under their hand,
   * so the card they just committed to disappears instead of confirming. The
   * wear is recorded on the server either way, and the next time the day is
   * loaded the rested pieces are duly skipped.
   */
  const signature = useMemo(
    () =>
      JSON.stringify([
        occasions,
        restDays,
        items.map((i) => [i.id, i.cat, i.warmth, i.formality, i.colorName, i.waterproof]),
      ]),
    [occasions, restDays, items],
  );

  const [answer, setAnswer] = useState<Answer>({
    signature: "",
    picks: null,
    error: null,
  });
  const inFlight = useRef("");

  useEffect(() => {
    if (status !== "ready" || inFlight.current === signature) return;
    inFlight.current = signature;
    api
      .fetchPicks(occasions, restDays)
      .then((r) => setAnswer({ signature, picks: r.picks, error: null }))
      .catch((e) =>
        setAnswer((prev) => ({
          signature,
          // Keep the last good answer on screen rather than blanking it.
          picks: prev.picks,
          error: e instanceof Error ? e.message : "Could not reach the engine",
        })),
      );
    // `signature` is the real dependency; the rest are read through it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, status]);

  return {
    picks: answer.picks,
    error: answer.error,
    // Loading is derived, not stored: it is simply "the answer on hand is not
    // the answer to the question being asked".
    loading: status !== "ready" || answer.signature !== signature,
  };
}
