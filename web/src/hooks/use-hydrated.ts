"use client";

import { useOutfitter } from "@/lib/store";

/**
 * True once the signed-in account's wardrobe has been read from the engine.
 * Use it to hold back counts that would otherwise flash a zero.
 *
 * This used to watch zustand's persist hydration, back when the wardrobe was
 * seeded into localStorage. There is no persisted copy any more — the engine
 * is the only source — so the thing worth waiting for is the first load.
 */
export function useHydrated() {
  return useOutfitter((s) => s.status === "ready");
}
