"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2 } from "lucide-react";
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
import { useOutfitter } from "@/lib/store";
import * as api from "@/lib/api";
import { EASE_OUT } from "@/lib/motion";
import type { Category, EditableKey, Item } from "@/lib/types";

/**
 * The photo goes to Florence-2 and the colour reader in `api/outfitter/
 * tagging.py`, and what comes back fills the form. It used to be a mock that
 * answered "Olive linen shirt" to every photo.
 *
 * The model is several gigabytes and loads on the first photo of a session, so
 * the first tag is slow and the rest are not. When the wheels for it are not
 * installed the API says so in `notes` and hands back a blank form with the
 * colour filled in — tagging by hand, rather than an error.
 */
function usePhotoDraft(
  onReady: (draft: Omit<Item, "id">, notes: string[]) => void,
  onBusy: (busy: boolean) => void,
) {
  const [over, setOver] = useState(false);
  // A callback ref, so nothing reads `.current` during render.
  const [input, setInput] = useState<HTMLInputElement | null>(null);

  const accept = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      toast("That file isn't an image.");
      return;
    }
    onBusy(true);
    try {
      const { draft, notes } = await api.tagPhoto(file);
      onReady(
        {
          ...draft,
          // Named from the file so two additions are never indistinguishable.
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || draft.name,
        },
        notes,
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "The tagger could not be reached.");
    } finally {
      onBusy(false);
    }
  };

  return {
    over,
    ref: setInput,
    open: () => input?.click(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      void accept(e.dataTransfer.files[0]);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onPick: (e: React.ChangeEvent<HTMLInputElement>) => void accept(e.target.files?.[0]),
  };
}

export function AddItemDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addItem = useOutfitter((s) => s.addItem);
  const [draft, setDraft] = useState<Omit<Item, "id"> | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [florence, setFlorence] = useState<boolean | null>(null);
  const { ref: fileInput, ...photo } = usePhotoDraft(
    (next, taggingNotes) => {
      setDraft(next);
      setNotes(taggingNotes);
    },
    setBusy,
  );

  // Asked once the dialog opens, so the wait can be explained before it starts
  // rather than after.
  useEffect(() => {
    if (!open || florence !== null) return;
    api
      .taggingStatus()
      .then((r) => setFlorence(r.available.florence))
      .catch(() => setFlorence(false));
  }, [open, florence]);

  const close = () => {
    onOpenChange(false);
    setDraft(null);
    setNotes([]);
  };

  const change = (key: EditableKey, value: string) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (key === "cat" && !SHAPES_BY_CATEGORY[value as Category].includes(next.shape)) {
        next.shape = SHAPE_FOR_CATEGORY[value as Category];
      }
      if (key === "shape") next.shape = value as Item["shape"];
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-[660px] rounded-[18px] bg-paper p-7 sm:max-w-[660px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-[-0.02em]">
            Add an item
          </DialogTitle>
          <DialogDescription className="sr-only">
            Upload a photo and confirm the tags.
          </DialogDescription>
        </DialogHeader>

        <input ref={fileInput} type="file" accept="image/*" hidden onChange={photo.onPick} />

        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.div
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid place-items-center rounded-[14px] border border-dashed border-stitch bg-linen px-5 py-13 text-center"
            >
              <Loader2 className="mb-3 size-7 animate-spin opacity-60" aria-hidden />
              <div className="text-base font-semibold">Reading the photo</div>
              <div className="mt-1 max-w-[42ch] text-[13.5px] text-ink-soft">
                Florence-2 names the garment and the colour is measured off the
                cloth. The first photo after starting the engine waits for the
                model to load.
              </div>
            </motion.div>
          ) : draft === null ? (
            <motion.button
              key="drop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              onClick={photo.open}
              onDrop={photo.onDrop}
              onDragOver={photo.onDragOver}
              onDragLeave={photo.onDragLeave}
              className={`w-full rounded-[14px] border border-dashed px-5 py-13 text-center transition-colors ${
                photo.over ? "border-ink bg-linen-2" : "border-stitch bg-linen hover:bg-linen-2"
              }`}
            >
              <Camera className="mx-auto mb-3.5 size-11 opacity-50" strokeWidth={1.4} aria-hidden />
              <div className="text-base font-semibold">Drop a photo, or click to browse</div>
              <div className="mt-1 text-[13.5px] text-ink-soft">
                One garment per photo, plain background works best
              </div>
              {florence === false ? (
                <div className="mx-auto mt-3 max-w-[44ch] text-[12.5px] text-ochre-ink">
                  Florence-2 isn&apos;t installed, so the photo&apos;s colour will
                  be read but you&apos;ll tag the rest yourself.
                </div>
              ) : null}
            </motion.button>
          ) : (
            <motion.div
              key="tags"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <div className="grid items-start gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
                <div className="grid place-items-center overflow-hidden rounded-[13px] bg-linen p-5">
                  <Garment item={draft} className="max-h-[190px]" />
                </div>
                <div>
                  <p className="mx-0.5 mb-2 text-[13px] text-ink-soft">
                    <b className="font-semibold text-ochre-ink">Auto-tagged.</b> Check
                    colour and material, those two slip most often.
                  </p>
                  {notes.length ? (
                    <ul className="mx-0.5 mb-2 grid gap-1 text-[12.5px] text-ochre-ink">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                  <ItemFields item={draft} onChange={change} />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  onClick={() => {
                    addItem(draft);
                    toast(COPY.added);
                    close();
                  }}
                  className="rounded-[10px] bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper transition-colors hover:bg-fern"
                >
                  Add to wardrobe
                </button>
                <button
                  onClick={close}
                  className="px-4 py-3 text-sm text-ink-soft hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
