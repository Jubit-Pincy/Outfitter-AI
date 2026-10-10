"use client";

import { motion } from "motion/react";
import { toast } from "sonner";
import { Garment } from "@/components/garment";
import { COPY } from "@/data/copy";
import { useOutfitter } from "@/lib/store";
import { fadeUp } from "@/lib/motion";
import type { Item, Outfit, Pick } from "@/lib/types";

type ScoredOutfit = Outfit & { score: number; items: Item[] };

export function OutfitCard({ outfit, pick }: { outfit: ScoredOutfit; pick: Pick }) {
  const chosenId = useOutfitter((s) => s.chosenOutfitId);
  const dismissed = useOutfitter((s) => s.dismissed[outfit.id] ?? false);
  const restDays = useOutfitter((s) => s.settings.restDays);
  const wearOutfit = useOutfitter((s) => s.wearOutfit);
  const toggleDismissed = useOutfitter((s) => s.toggleDismissed);

  // The pieces come down with the pick, already in the order they are worn,
  // so there is nothing to look up and nothing that can fall out of step.
  const pieces = outfit.items;
  const chosen = chosenId === outfit.id;

  const chips = [
    `${Math.round(pick.weather.temp)}°C`,
    pick.weather.rainProbability >= 50
      ? "Rain likely"
      : `${Math.round(pick.weather.rainProbability)}% rain`,
    `${pick.wants.formality.replace("-", " ")} · ${pick.wants.warmth}`,
  ];

  return (
    <motion.article
      variants={fadeUp}
      animate={{ opacity: dismissed ? 0.4 : 1 }}
      className="relative rounded-2xl bg-paper p-4 pb-[18px] text-ink"
    >
      {chosen ? (
        <motion.span
          layoutId="chosen-ring"
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-sage ring-inset"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      ) : null}

      <div className="m-0.5 mb-3 flex items-baseline justify-between gap-3">
        <span className="block text-[11px] font-semibold tracking-[0.1em] text-ink-soft">
          {outfit.rank.toUpperCase()}
        </span>
        <span
          className="text-[11px] text-ink-soft tabular-nums"
          title="What the engine scored this outfit, out of roughly 5"
        >
          {outfit.score.toFixed(2)}
        </span>
      </div>

      {/* Three pieces read as a hero and two supports; four fill an even grid,
          rather than stranding the fourth alone in a third row. */}
      <div
        className={
          pieces.length === 3
            ? "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] grid-rows-2 gap-2.5"
            : "grid grid-cols-2 gap-2.5"
        }
      >
        {pieces.map((piece, i) => (
          <div
            key={piece.id}
            className={`group relative grid min-h-[104px] place-items-center overflow-hidden rounded-[11px] bg-linen p-3 pb-7 transition-colors hover:bg-linen-2 sm:min-h-[128px] ${
              i === 0 && pieces.length === 3 ? "row-span-2" : ""
            }`}
          >
            <Garment item={piece} className="max-h-[150px]" />
            {/* Always readable: on a touch screen there is no hover, and this was
                the only text naming the piece. */}
            <span className="absolute right-2 bottom-2 left-[11px] truncate text-[12px] text-ink-soft transition-colors group-hover:text-ink">
              {piece.name}
            </span>
          </div>
        ))}
      </div>

      <p className="mx-0.5 mt-4 mb-2.5 max-w-[52ch] font-serif text-[18px] leading-[1.4] italic">
        {outfit.note}
      </p>

      {/* What the pick was actually made from, so the claim is checkable. */}
      <ul className="mx-0.5 mb-3.5 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li
            key={chip}
            className="rounded-full bg-linen px-2.5 py-1 text-[11.5px] text-ink-soft"
          >
            {chip}
          </li>
        ))}
      </ul>

      <div className="flex gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            wearOutfit(outfit.id, outfit.ids);
            toast(COPY.wore(restDays));
          }}
          className={`rounded-[10px] px-5 py-2.5 text-[14.5px] font-semibold text-paper transition-colors ${
            chosen ? "bg-sage" : "bg-ink hover:bg-fern"
          }`}
        >
          {chosen ? "Wearing today" : "Wear this"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          aria-pressed={dismissed}
          onClick={() => {
            const next = toggleDismissed(outfit.id);
            // Waving off the outfit you are wearing quietly un-wears it, so
            // say that rather than leaving the change to be noticed later.
            toast(next ? (chosen ? COPY.unwore : COPY.dismissed) : COPY.restored);
          }}
          className={`rounded-[10px] border px-[18px] py-2.5 text-[14.5px] transition-colors ${
            dismissed
              ? "border-ink bg-linen-2 font-medium text-ink"
              : "border-stitch text-ink-soft hover:border-ink"
          }`}
        >
          {dismissed ? "Set aside · Undo" : "Not today"}
        </motion.button>
      </div>
    </motion.article>
  );
}
