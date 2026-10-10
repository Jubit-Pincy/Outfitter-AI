import clips from "@/data/sky-clips.json";
import { conditionFor } from "@/lib/sky-conditions";

/**
 * The footage behind a forecast: one self-hosted loop per condition, day and
 * night, trimmed to eight seconds in `public/sky/video`.
 *
 * `sky-clips.json` is the record of what was chosen and who shot it — the
 * clips were picked by hand from Pixabay, and their authors are credited on
 * every surface that plays them. The files are local, so nothing here depends
 * on Pixabay staying up or on their CDN's latency.
 */

interface PinnedRecord {
  author: string;
  license: string;
  href: string;
}

export interface SkyClipSource {
  /** The trimmed loop, served from our own origin. */
  src: string;
  /** The still that holds the frame until the loop can play. */
  poster: string;
  author: string;
  href: string;
}

/**
 * The clip for a weather code, or null when the forecast has no footage — in
 * which case the caller keeps the painted sky it already had.
 */
export function skyClipFor(code: number, isDay: boolean): SkyClipSource | null {
  const condition = conditionFor(code);
  const key = `${condition.key}-${isDay ? "day" : "night"}`;
  const record = (clips as Record<string, PinnedRecord>)[key];
  if (!record) return null;

  return {
    src: `/sky/video/${key}.mp4`,
    poster: `/sky/video/${key}.jpg`,
    author: record.author,
    href: record.href,
  };
}
