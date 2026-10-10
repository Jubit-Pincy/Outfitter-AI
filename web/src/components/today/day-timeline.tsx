"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { KindIcon } from "@/components/kind-icon";
import { Panel } from "@/components/ui/panel";
import { Scroller } from "@/components/ui/scroller";
import { useOutfitter } from "@/lib/store";
import { toMinutes } from "@/lib/time";

/**
 * Which slot the day is currently in: the last one that has already started.
 *
 * Read after mount rather than during render — the server has no idea what
 * time it is where the reader is, and a guess would mismatch on hydration.
 * -1 until then, which simply means no slot is marked.
 */
function useCurrentSlot(times: string[]) {
  const [index, setIndex] = useState(-1);

  useEffect(() => {
    const mark = () => {
      const now = new Date().getHours() * 60 + new Date().getMinutes();
      let current = -1;
      times.forEach((time, i) => {
        if (toMinutes(time) <= now) current = i;
      });
      setIndex(current);
    };
    mark();
    // The day moves on while the page is open.
    const timer = setInterval(mark, 60_000);
    return () => clearInterval(timer);
  }, [times.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return index;
}

export function DayTimeline() {
  const schedule = useOutfitter((s) => s.schedule);
  const nowIndex = useCurrentSlot(schedule.map((slot) => slot.time));

  return (
    <Panel className="flex flex-col justify-center px-6 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-[-0.01em]">Your day</h2>
        <Link
          href="/schedule"
          className="-mr-2 rounded-lg px-2 py-2 text-[13.5px] text-fern underline underline-offset-[3px] transition-colors hover:bg-linen"
        >
          Change
        </Link>
      </div>

      {schedule.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nothing scheduled. Picks assume a normal weekday.
        </p>
      ) : (
        /* A full day can hold more slots than the card is wide, so the row
           scrolls rather than spilling onto the page. Focusable, or a keyboard
           can't reach the slots that have scrolled out of sight. */
        <Scroller
          tabIndex={0}
          role="group"
          aria-label="Today's schedule"
          className="-mx-1 px-1 pb-1 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <div className="relative flex w-max min-w-full">
            <div
              aria-hidden
              className="absolute top-4 right-8 left-8 border-t border-dashed border-stitch"
            />
            {schedule.map((slot, i) => (
              <motion.div
                key={slot.id}
                layout
                className="relative z-1 min-w-19 flex-1 px-1 text-center"
              >
                <span
                  className={`mx-auto mb-2 grid size-8.25 place-items-center rounded-full border ${
                    i === nowIndex
                      ? "border-ochre bg-ochre text-ink"
                      : "border-stitch bg-paper"
                  }`}
                >
                  <KindIcon kind={slot.kind} />
                </span>
                <span className="block text-xs text-ink-soft">{slot.time}</span>
                <span className="block text-[13.5px] font-semibold">
                  {slot.kind}
                </span>
              </motion.div>
            ))}
          </div>
        </Scroller>
      )}
    </Panel>
  );
}
