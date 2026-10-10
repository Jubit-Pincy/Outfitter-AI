"use client";

import { create } from "zustand";
import { toMinutes } from "@/lib/time";
import { SHAPE_FOR_CATEGORY } from "@/data/garment-shapes";
import { SHAPES_BY_CATEGORY } from "@/data/options";
import * as api from "@/lib/api";
import type { Account, Category, Item, Settings, Slot, SlotKind } from "@/lib/types";

export type Filter = Category | "All";

/**
 * The client's copy of what the engine holds.
 *
 * This store used to seed itself from `data/` and persist to localStorage,
 * which is why an edited seed file appeared for one frame and was then
 * overwritten. The wardrobe now belongs to a signed-in account in the Python
 * service, so this is a cache of it: every mutation moves local state at once
 * for the tap to feel instant, sends the change, and rolls back if the service
 * refuses. Nothing is written to localStorage, so there is no stale copy to
 * clear.
 */
interface OutfitterState {
  account: Account | null;
  items: Item[];
  schedule: Slot[];
  settings: Settings;
  /** "loading" until the first read of the session finishes. */
  status: "loading" | "signed-out" | "ready";
  /** Set when a write was rejected, so a screen can say so. */
  error: string | null;

  /** Outfit the user committed to today. */
  chosenOutfitId: string | null;
  /** Outfits the user waved off. */
  dismissed: Record<string, boolean>;
  /** Wardrobe category filter. */
  filter: Filter;

  load: () => Promise<void>;
  adopt: (account: Account) => Promise<void>;
  signOut: () => Promise<void>;

  setFilter: (filter: Filter) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  removeItem: (id: string) => void;
  restoreItem: (item: Item, at?: number) => void;
  addItem: (draft: Omit<Item, "id">) => void;
  wearOutfit: (id: string, ids: string[]) => void;
  toggleDismissed: (id: string) => boolean;
  /** Returns false when that slot is already on the day. */
  addSlot: (time: string, kind: SlotKind) => boolean;
  removeSlot: (id: string) => void;
  restoreSlot: (slot: Slot) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

/** What the screens render before anyone has signed in. */
export const BLANK_SETTINGS: Settings = {
  location: "Jaipur",
  units: "Celsius",
  restDays: 5,
  formalityMap: {
    Gym: "Athletic",
    Office: "Smart casual",
    "Dinner out": "Formal",
  },
  email: "",
  name: "",
};

const sortSlots = (slots: Slot[]) =>
  [...slots].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

export const useOutfitter = create<OutfitterState>()((set, get) => ({
  account: null,
  items: [],
  schedule: [],
  settings: BLANK_SETTINGS,
  status: "loading",
  error: null,
  chosenOutfitId: null,
  dismissed: {},
  filter: "All",

  /** Read the session and everything that hangs off it. */
  load: async () => {
    try {
      const { user } = await api.me();
      await get().adopt(user);
    } catch {
      set({ status: "signed-out", account: null, items: [], schedule: [] });
    }
  },

  adopt: async (account) => {
    set({ account, settings: { ...BLANK_SETTINGS, ...account.settings } });
    const [items, schedule] = await Promise.all([
      api.fetchItems().then((r) => r.items),
      api.fetchSchedule().then((r) => r.schedule),
    ]);
    set({ items, schedule: sortSlots(schedule), status: "ready", error: null });
  },

  signOut: async () => {
    await api.logout().catch(() => {});
    set({
      account: null,
      items: [],
      schedule: [],
      settings: BLANK_SETTINGS,
      status: "signed-out",
      chosenOutfitId: null,
      dismissed: {},
    });
  },

  setFilter: (filter) => set({ filter }),

  updateItem: (id, patch) => {
    const before = get().items;
    set({
      items: before.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        // Keep the drawing in step with the category, but only when the chosen
        // one no longer belongs to it — otherwise an edit would silently throw
        // away a knit or a boot.
        if (patch.cat && !SHAPES_BY_CATEGORY[patch.cat].includes(next.shape)) {
          next.shape = SHAPE_FOR_CATEGORY[patch.cat];
        }
        return next;
      }),
    });
    const sent = get().items.find((i) => i.id === id);
    api.patchItem(id, sent ?? patch).catch((e) => {
      set({ items: before, error: String(e.message) });
    });
  },

  removeItem: (id) => {
    const before = get().items;
    set({ items: before.filter((item) => item.id !== id) });
    api.deleteItem(id).catch((e) => set({ items: before, error: String(e.message) }));
  },

  restoreItem: (item, at) => {
    const items = get().items;
    if (items.some((x) => x.id === item.id)) return;
    // Undo puts the piece back where it was, not at the end of the drawer.
    const next = [...items];
    next.splice(at ?? next.length, 0, item);
    set({ items: next });
    api.createItem(item).catch((e) => set({ error: String(e.message) }));
  },

  addItem: (draft) => {
    const shape = draft.shape ?? SHAPE_FOR_CATEGORY[draft.cat];
    api
      .createItem({ ...draft, shape })
      // The id is the engine's to give, so the piece appears when it answers.
      .then(({ item }) => set((s) => ({ items: [...s.items, item] })))
      .catch((e) => set({ error: String(e.message) }));
  },

  wearOutfit: (id, ids) => {
    const now = Date.now();
    const worn = new Set(ids);
    set((s) => ({
      chosenOutfitId: id,
      dismissed: { ...s.dismissed, [id]: false },
      // Recording the wear is the whole point of the button: it is what gives
      // the rest period something to measure against.
      items: s.items.map((item) => (worn.has(item.id) ? { ...item, lastWorn: now } : item)),
    }));
    api.markWorn(ids).catch((e) => set({ error: String(e.message) }));
  },

  toggleDismissed: (id) => {
    const next = !get().dismissed[id];
    set((s) => ({
      dismissed: { ...s.dismissed, [id]: next },
      chosenOutfitId: next && s.chosenOutfitId === id ? null : s.chosenOutfitId,
    }));
    return next;
  },

  addSlot: (time, kind) => {
    // The same thing twice at the same time is a mis-click, not a plan.
    if (get().schedule.some((s) => s.time === time && s.kind === kind)) return false;
    api
      .createSlot(time, kind)
      .then(({ schedule }) => set({ schedule: sortSlots(schedule) }))
      .catch((e) => set({ error: String(e.message) }));
    return true;
  },

  removeSlot: (id) => {
    const before = get().schedule;
    set({ schedule: before.filter((slot) => slot.id !== id) });
    api.deleteSlot(id).catch((e) => set({ schedule: before, error: String(e.message) }));
  },

  restoreSlot: (slot) => {
    if (get().schedule.some((x) => x.id === slot.id)) return;
    set((s) => ({ schedule: sortSlots([...s.schedule, slot]) }));
    api
      .createSlot(slot.time, slot.kind)
      .then(({ schedule }) => set({ schedule: sortSlots(schedule) }))
      .catch((e) => set({ error: String(e.message) }));
  },

  updateSettings: (patch) => {
    const before = get().settings;
    set({ settings: { ...before, ...patch } });
    // Name and email are the account's, and the engine keeps one copy of each.
    const { name, email, ...rest } = { ...before, ...patch };
    api
      .updateProfile({ name, email, settings: rest })
      .catch((e) => set({ settings: before, error: String(e.message) }));
  },
}));

/** Look an item up by id. */
export const itemById = (items: Item[], id: string) =>
  items.find((item) => item.id === id);
