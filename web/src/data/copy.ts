/** Toast copy, kept verbatim from the prototype. */
export const COPY = {
  wore: (restDays: number) => `Logged. These pieces rest for ${restDays} days.`,
  dismissed: "Noted, fewer like this",
  restored: "Back in the running",
  saved: "Saved",
  removed: "Removed from wardrobe",
  added: "Added to wardrobe",
  slotRemoved: "Slot removed",
  slotDuplicate: "That's already on today.",
  unwore: "Taken off. These pieces are free again.",
  scheduleUpdated: "Today updated",
} as const;
