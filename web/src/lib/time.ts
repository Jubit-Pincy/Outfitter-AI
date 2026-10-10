/** "19:30" -> 1170. Used to keep the day's slots in order. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

export const TIME_OPTIONS = [
  "6:30",
  "7:00",
  "8:00",
  "9:00",
  "10:00",
  "13:00",
  "17:00",
  "19:30",
  "21:00",
];

/** "Wednesday, 9 September" — the Today page's headline. */
export function dateLine(now = new Date()): string {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * "14" from a local naive ISO like "2026-09-11T14:00". Deliberately string
 * slicing, not `new Date()`: the API already returns the location's local
 * time, and parsing would re-interpret it in the viewer's timezone.
 */
export function hourLabel(iso: string): string {
  return iso.slice(11, 13);
}

/** "Today", then "Mon", "Tue", … for a local date like "2026-09-11". */
export function dayLabel(date: string, index: number): string {
  if (index === 0) return "Today";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
}

const DAY = 86_400_000;

/**
 * "Yesterday", "6 days ago", "3 weeks ago" from a stamp.
 *
 * The prototype hard-coded these words, which meant the wardrobe never aged.
 * Deriving them from `lastWorn` is what lets the rest period mean anything.
 */
export function wornLabel(lastWorn: number | null, now = Date.now()): string {
  if (lastWorn == null) return "Not yet worn";
  const days = Math.floor((now - lastWorn) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return `${weeks} weeks ago`;
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** True while a piece is still inside its rest period. */
export function isResting(
  lastWorn: number | null,
  restDays: number,
  now = Date.now()
): boolean {
  if (lastWorn == null) return false;
  return now - lastWorn < restDays * DAY;
}
