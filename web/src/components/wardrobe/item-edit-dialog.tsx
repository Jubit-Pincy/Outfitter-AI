"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Garment } from "@/components/garment";
import { ItemFields } from "./item-fields";
import { COPY } from "@/data/copy";
import { SHAPE_FOR_CATEGORY } from "@/data/garment-shapes";
import { SHAPES_BY_CATEGORY } from "@/data/options";
import { itemById, useOutfitter } from "@/lib/store";
import type { Category, EditableKey, Item } from "@/lib/types";

/** Keyed on the item id, so opening a piece seeds a fresh draft on mount. */
function ItemEditForm({ item, onClose }: { item: Item; onClose: () => void }) {
  const updateItem = useOutfitter((s) => s.updateItem);
  const removeItem = useOutfitter((s) => s.removeItem);
  const restoreItem = useOutfitter((s) => s.restoreItem);
  const [draft, setDraft] = useState<Item>(() => ({ ...item }));

  const change = (key: EditableKey, value: string) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: value } as Item;
      if (
        key === "cat" &&
        !SHAPES_BY_CATEGORY[value as Category].includes(next.shape)
      ) {
        next.shape = SHAPE_FOR_CATEGORY[value as Category];
      }
      if (key === "shape") next.shape = value as Item["shape"];
      return next;
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold tracking-[-0.02em]">
          {draft.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Edit the tags on this piece.
        </DialogDescription>
      </DialogHeader>

      <div className="grid items-start gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid place-items-center rounded-[13px] bg-linen p-5">
          <Garment item={draft} className="max-h-[190px]" />
        </div>
        <ItemFields item={draft} onChange={change} />
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <button
          onClick={() => {
            updateItem(draft.id, draft);
            toast(COPY.saved);
            onClose();
          }}
          className="rounded-[10px] bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper transition-colors hover:bg-fern"
        >
          Save changes
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 text-sm text-ink-soft hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const restore = { ...item };
            removeItem(item.id);
            onClose();
            toast(COPY.removed, {
              action: { label: "Undo", onClick: () => restoreItem(restore) },
            });
          }}
          className="ml-auto px-4 py-3 text-sm text-ink-soft hover:text-destructive"
        >
          Remove item
        </button>
      </div>
    </>
  );
}

export function ItemEditDialog({
  itemId,
  onClose,
}: {
  itemId: string | null;
  onClose: () => void;
}) {
  const items = useOutfitter((s) => s.items);
  const stored = itemId ? itemById(items, itemId) : undefined;

  return (
    <Dialog
      open={stored !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-[660px] rounded-[18px] bg-paper p-7 sm:max-w-[660px]">
        {stored ? (
          <ItemEditForm key={stored.id} item={stored} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
