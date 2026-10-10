"use client";

import { Chip } from "@/components/ui/chip";
import { wornLabel } from "@/lib/time";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/page-header";
import { Garment } from "@/components/garment";
import { AddItemDialog } from "./add-item-dialog";
import { ItemEditDialog } from "./item-edit-dialog";
import { CATEGORIES } from "@/data/options";
import { useHydrated } from "@/hooks/use-hydrated";
import { useOutfitter, type Filter } from "@/lib/store";
import { cardPop } from "@/lib/motion";

const FILTERS: Filter[] = ["All", ...CATEGORIES];

export function WardrobeScreen() {
  const items = useOutfitter((s) => s.items);
  const filter = useOutfitter((s) => s.filter);
  const setFilter = useOutfitter((s) => s.setFilter);
  const hydrated = useHydrated();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  /**
   * The dialog is state-controlled, so Radix has no trigger to hand focus back
   * to and drops it at the top of the document. Remember the card and restore
   * it ourselves, or editing the twelfth piece sends you back to the header.
   */
  const closeEditor = () => {
    const id = editingId;
    setEditingId(null);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id ?? "")}"]`)
        ?.focus();
    });
  };

  const shown = items.filter((item) => filter === "All" || item.cat === filter);

  return (
    <>
      <PageHeader
        title="Wardrobe"
        lede={
          hydrated ? `${items.length} items, all tags editable` : " "
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2.5">
        {FILTERS.map((option) => (
          <Chip
            key={option}
            selected={option === filter}
            onClick={() => setFilter(option)}
          >
            {option}
          </Chip>
        ))}
        <button
          onClick={() => setAddOpen(true)}
          className="ml-auto rounded-[10px] bg-ochre px-5 py-2.5 text-sm font-semibold text-ink transition-[filter] hover:brightness-105"
        >
          + Add item
        </button>
      </div>

      {hydrated && shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stitch bg-paper p-10 text-center">
          <div className="text-[15px] font-semibold">
            {items.length === 0
              ? "Your wardrobe is empty"
              : `Nothing filed under ${filter}`}
          </div>
          <div className="mt-1 text-[13.5px] text-ink-soft">
            {items.length === 0
              ? "Add a piece and it shows up here."
              : "Other categories still have pieces in them."}
          </div>
          {items.length === 0 ? null : (
            <button
              onClick={() => setFilter("All")}
              className="mt-4 rounded-[10px] border border-stitch px-4 py-2 text-[13.5px] transition-colors hover:border-ink"
            >
              Show all items
            </button>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((item) => (
            <motion.button
              key={item.id}
              layout
              variants={cardPop}
              initial="hidden"
              animate="show"
              exit="exit"
              whileHover={{ y: -2 }}
              data-item-id={item.id}
              onClick={() => setEditingId(item.id)}
              className="rounded-[13px] bg-paper p-3.5 text-left shadow-none transition-shadow hover:shadow-[0_6px_20px_rgba(32,38,43,.09)]"
            >
              <Garment item={item} className="h-26 w-full" />
              <span className="mt-2 block text-[13px] leading-tight">
                {item.name}
              </span>
              <span className="mt-1 block text-[11.5px] text-ink-soft">
                {/* "Worn not yet worn" is what the prefix did to a piece that
                    had never been worn, which is most of a new wardrobe. */}
                {item.lastWorn == null
                  ? "Not yet worn"
                  : `Worn ${wornLabel(item.lastWorn).toLowerCase()}`}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <ItemEditDialog itemId={editingId} onClose={closeEditor} />
      <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
