"use client";

import { wornLabel } from "@/lib/time";
import { Pencil } from "lucide-react";
import { FieldSelect } from "./field-select";
import {
  CATEGORIES,
  COLOR_NAMES,
  FORMALITIES,
  MATERIALS,
  WARMTHS,
  SHAPE_LABEL,
  SHAPES_BY_CATEGORY,
  swatchFor,
} from "@/data/options";
import type { EditableKey, GarmentShape, Item } from "@/lib/types";

const shapeFromLabel = (label: string) =>
  (Object.keys(SHAPE_LABEL) as GarmentShape[]).find(
    (s) => SHAPE_LABEL[s] === label
  ) ?? "shirt";

const ROWS: { label: string; key: EditableKey; options: readonly string[] }[] = [
  { label: "Category", key: "cat", options: CATEGORIES },
  { label: "Drawing", key: "shape", options: [] },
  { label: "Colour", key: "colorName", options: COLOR_NAMES },
  { label: "Material", key: "material", options: MATERIALS },
  { label: "Warmth", key: "warmth", options: WARMTHS },
  { label: "Formality", key: "formality", options: FORMALITIES },
];

/** The dashed care-label block of editable tags. */
export function ItemFields({
  item,
  onChange,
}: {
  item: Omit<Item, "id">;
  onChange: (key: EditableKey, value: string) => void;
}) {
  return (
    <div className="rounded-[11px] border border-dashed border-stitch bg-linen px-4 py-0.5">
      {/* The add flow used to name every piece "Olive linen shirt" with no way
          to change it, so a wardrobe filled with indistinguishable rows. */}
      <div className="flex items-center justify-between gap-3.5 border-b border-dashed border-stitch py-3">
        <label className={"text-[13px] text-ink-soft"} htmlFor="item-name">
          Name
        </label>
        <input
          id="item-name"
          value={item.name}
          onChange={(e) => onChange("name", e.target.value)}
          className="w-full max-w-[190px] border-b border-stitch bg-transparent py-0.5 text-right text-[14.5px] font-medium outline-none focus:border-ink"
        />
      </div>
      {ROWS.map((row) => (
        <div
          key={row.key}
          className="flex items-center justify-between gap-3.5 border-b border-dashed border-stitch py-3 last:border-b-0"
        >
          <span className="text-[13px] text-ink-soft">{row.label}</span>
          <span className="flex items-center gap-2">
            {row.key === "colorName" ? (
              <span
                aria-hidden
                className="size-[15px] rounded-[3px] border border-stitch"
                style={{ background: swatchFor(item.colorName) }}
              />
            ) : null}
            <FieldSelect
              label={row.label}
              value={
                row.key === "shape"
                  ? SHAPE_LABEL[item.shape]
                  : (item[row.key] as string)
              }
              options={
                row.key === "shape"
                  ? SHAPES_BY_CATEGORY[item.cat].map((s) => SHAPE_LABEL[s])
                  : row.options
              }
              onChange={(value) =>
                onChange(
                  row.key,
                  row.key === "shape" ? shapeFromLabel(value) : value
                )
              }
            />
            <Pencil className="size-[13px] opacity-35" aria-hidden />
          </span>
        </div>
      ))}
      {true ? (
        <div className="flex items-center justify-between gap-3.5 border-t border-dashed border-stitch py-3">
          <span className="text-[13px] text-ink-soft">Last worn</span>
          <span className="text-[14.5px] font-medium">{wornLabel(item.lastWorn)}</span>
        </div>
      ) : null}
    </div>
  );
}
