import { NowDot } from "./now-dot";
import type { LucideIcon } from "lucide-react";
import { Panel, PanelTitle } from "@/components/ui/panel";

/** The tile's headline figure. Shared so the three that draw their own
 * panel body can't drift from the rest of the grid. */
export function TileValue({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
      {children}
    </p>
  );
}

/** The shell every tile in the grid shares. */
export function MetricTile({
  icon,
  label,
  value,
  note,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
  /** Optional small visual, drawn between the value and the note. */
  children?: React.ReactNode;
}) {
  return (
    <Panel className="flex flex-col px-5 py-4">
      <PanelTitle icon={icon}>{label}</PanelTitle>
      <TileValue>{value}</TileValue>
      {children}
      {note && (
        <p className="mt-auto pt-3 text-[12.5px] leading-[1.45] text-ink-soft">
          {note}
        </p>
      )}
    </Panel>
  );
}

/**
 * A marker on a coloured scale, shared by the air-quality and UV tiles.
 * `at` is a fraction of the way along the bar.
 */
export function ScaleBar({ at, from }: { at: number; from: string }) {
  return (
    <div className="relative mt-3 h-1.5 rounded-full" aria-hidden>
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundImage: from }}
      />
      <NowDot at={at} />
    </div>
  );
}

export const SCALE =
  "linear-gradient(to right, #6f9e62 0%, #d8b135 40%, #d1712f 62%, #b8453a 80%, #7a3b6b 100%)";
