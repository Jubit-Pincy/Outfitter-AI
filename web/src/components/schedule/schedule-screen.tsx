"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { KindIcon, SLOT_KINDS } from "@/components/kind-icon";
import { COPY } from "@/data/copy";
import { TIME_OPTIONS } from "@/lib/time";
import { useOutfitter } from "@/lib/store";
import type { SlotKind } from "@/lib/types";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";

export function ScheduleScreen() {
  const schedule = useOutfitter((s) => s.schedule);
  const addSlot = useOutfitter((s) => s.addSlot);
  const removeSlot = useOutfitter((s) => s.removeSlot);
  const restoreSlot = useOutfitter((s) => s.restoreSlot);

  const [time, setTime] = useState("13:00");
  const [kind, setKind] = useState<SlotKind>("Casual");

  return (
    <>
      <PageHeader
        title="Today's plan"
        lede="Picks refresh as soon as you change something here."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-6">
          <h2 className="mb-3 text-base font-semibold tracking-[-0.01em]">
            Slots
          </h2>
          {schedule.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stitch bg-linen p-7 text-center">
              <div className="text-[15px] font-semibold">Nothing planned yet</div>
              <div className="mt-1 text-[13.5px] text-ink-soft">
                Add a slot and Today rebuilds around it.
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {schedule.map((slot) => (
                <motion.div
                  key={slot.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="mb-2.5 flex items-center gap-3.5 rounded-[11px] bg-linen px-4 py-3.5"
                >
                  <span className="w-16 text-[14.5px] font-semibold">
                    {slot.time}
                  </span>
                  <span className="flex flex-1 items-center gap-2 text-[14.5px]">
                    <KindIcon kind={slot.kind} />
                    {slot.kind}
                  </span>
                  <button
                    aria-label={`Remove ${slot.kind}`}
                    onClick={() => {
                      removeSlot(slot.id);
                      toast(COPY.slotRemoved, {
                        action: {
                          label: "Undo",
                          onClick: () => restoreSlot(slot),
                        },
                      });
                    }}
                    className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-md text-lg leading-none text-ink-soft transition-colors hover:bg-linen-2 hover:text-ink"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Panel>

        <Panel className="p-6">
          <h2 className="mb-3 text-base font-semibold tracking-[-0.01em]">
            Add a slot
          </h2>
          <p className="mb-3 text-[13px] text-ink-soft">
            Pick a time, pick what it is.
          </p>

          <div className="mt-2.5 mb-5 flex flex-wrap gap-2">
            {TIME_OPTIONS.map((option) => (
              <Chip
                key={option}
                selected={option === time}
                onClick={() => setTime(option)}
              >
                {option}
              </Chip>
            ))}
          </div>

          <div className="mt-2.5 mb-5 flex flex-wrap gap-2">
            {SLOT_KINDS.map((option) => (
              <Chip
                key={option}
                selected={option === kind}
                onClick={() => setKind(option)}
                className="inline-flex items-center gap-[7px]"
              >
                <KindIcon kind={option} />
                {option}
              </Chip>
            ))}
          </div>

          <button
            onClick={() => {
              const added = addSlot(time, kind);
              toast(added ? COPY.scheduleUpdated : COPY.slotDuplicate);
            }}
            className="w-full rounded-[10px] bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper transition-colors hover:bg-fern"
          >
            Add to today
          </button>
        </Panel>
      </div>
    </>
  );
}
