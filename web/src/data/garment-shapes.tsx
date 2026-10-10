import type { ReactNode } from "react";
import type { Category, GarmentShape } from "@/lib/types";

// Set per garment by <Garment>: a dark line on pale cloth, a light one on dark.
const S = "var(--garment-line)";
// Interior detail — plackets, seams, soles. Was hardcoded ink, so it stayed
// invisible on dark cloth even after the outline learned to flip.
const D = "var(--garment-detail)";

/**
 * The garment drawings, kept from the prototype and extended with a dress, a
 * skirt and a bag for the categories the engine tags that the prototype had
 * no name for. Every shape shares the 0 0 100 100 box, so tiles can size them
 * freely. They are the fallback: a piece with a photo shows the photo.
 */
export const GARMENTS: Record<
  GarmentShape,
  { viewBox: string; render: (fill: string) => ReactNode }
> = {
  tee: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M35 18 20 26l6 14 7-3v45h34V37l7 3 6-14-15-8-8 6h-14z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M41 18c2 5 16 5 18 0" fill="none" stroke={S} strokeWidth={1.4} />
      </>
    ),
  },
  shirt: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M36 17 20 25l5 15 7-3v47h36V37l7 3 5-15-16-8-14 7z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M36 17l14 7 14-7M50 24v60" fill="none" stroke={D} strokeWidth={1.3} />
      </>
    ),
  },
  knit: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M34 20 17 29l7 16 8-4v43h36V41l8 4 7-16-17-9-8 5h-14z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M40 20c3 6 17 6 20 0" fill="none" stroke={S} strokeWidth={1.4} />
        <path d="M32 74h36" fill="none" stroke={D} strokeWidth={1.2} />
      </>
    ),
  },
  jacket: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M37 16 18 25l6 18 8-4v45h36V39l8 4 6-18-19-9-6 5h-11z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M50 21v63M37 16l13 5 13-5" fill="none" stroke={S} strokeWidth={1.3} />
        <circle cx={55} cy={45} r={1.6} fill="var(--garment-line)" />
        <circle cx={55} cy={58} r={1.6} fill="var(--garment-line)" />
      </>
    ),
  },
  jeans: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M31 12h38l3 76H55l-5-40-5 40H28z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M31 20h38M50 20v28" fill="none" stroke={D} strokeWidth={1.2} />
      </>
    ),
  },
  shorts: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M30 22h40l3 44H55l-5-22-5 22H27z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M30 30h40" fill="none" stroke={D} strokeWidth={1.2} />
      </>
    ),
  },
  sneaker: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M14 62c0-9 6-14 12-18l10-6 6 9 10-3 7 6c9 2 25 5 27 12 1 5 0 8 0 8H16s-2-4-2-8z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M14 66h72" fill="none" stroke="var(--garment-line)" strokeWidth={2.4} />
        <path d="M38 42l7 8M46 47l7 7" fill="none" stroke={D} strokeWidth={1.3} />
      </>
    ),
  },
  boot: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M30 20h20l2 30c0 6 14 9 22 13 6 3 6 9 6 9H30z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M28 72h54" fill="none" stroke={D} strokeWidth={2.6} />
      </>
    ),
  },
  loafer: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M18 58c4-6 12-9 20-9h16c10 0 26 5 30 10 3 4 2 9 2 9H20s-4-6-2-10z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M18 68h68" fill="none" stroke={D} strokeWidth={2.4} />
        <path d="M40 54h14" fill="none" stroke={D} strokeWidth={1.4} />
      </>
    ),
  },
  dress: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M36 18 22 25l5 13 6-3 -8 47h50l-8-47 6 3 5-13-14-7-7 5h-9z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M41 18c2 5 16 5 18 0M33 52h34" fill="none" stroke={D} strokeWidth={1.3} />
      </>
    ),
  },
  skirt: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M32 30h36l8 46H24z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M32 38h36M46 38l-4 38M58 38l3 38" fill="none" stroke={D} strokeWidth={1.3} />
      </>
    ),
  },
  bag: {
    viewBox: "0 0 100 100",
    render: (c) => (
      <>
        <path d="M28 38h44l5 40H23z" fill={c} stroke={S} strokeWidth={1.4} strokeLinejoin="round" />
        <path d="M40 38V28a10 10 0 0 1 20 0v10" fill="none" stroke={S} strokeWidth={1.4} />
      </>
    ),
  },
};

/** Fallback drawing when an item changes category in the editor. */
export const SHAPE_FOR_CATEGORY: Record<Category, GarmentShape> = {
  Tops: "shirt",
  Bottoms: "jeans",
  Dresses: "dress",
  Outerwear: "jacket",
  Shoes: "sneaker",
  Accessories: "bag",
};
