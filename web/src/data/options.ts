import type {
  Category,
  Formality,
  GarmentShape,
  Material,
  Warmth,
} from "@/lib/types";

/** Colour name -> swatch hex, ported from the prototype. */
/**
 * Colour name -> swatch hex.
 *
 * These are the 29 colours `api/outfitter/tagging.py` can return, in the same
 * order and to the same values, so a chip on screen is the colour the tagger
 * actually matched rather than an approximation of it.
 */
export const SWATCH: Record<string, string> = {
  Black: "#141416",
  Charcoal: "#3C3E42",
  Grey: "#8E9299",
  "Light grey": "#C8CACE",
  White: "#FAFAF8",
  Cream: "#F3ECDE",
  Beige: "#E1D2BC",
  Camel: "#C19A6B",
  Khaki: "#A8986E",
  Chocolate: "#5C4033",
  Brown: "#7A5433",
  Terracotta: "#BA6242",
  Rust: "#A8552F",
  Salmon: "#E8917A",
  Orange: "#DE7A30",
  Red: "#B22C2C",
  Burgundy: "#722632",
  Wine: "#622230",
  Pink: "#E8A8BA",
  "Dusty rose": "#C69194",
  Mauve: "#AA8AA0",
  Sage: "#8B9B7C",
  Green: "#567A50",
  Olive: "#6F7343",
  Teal: "#3C8282",
  "Light blue": "#A8C4DC",
  Blue: "#4064A8",
  Denim: "#4E6A8E",
  Navy: "#2C3550",
};

export const CATEGORIES: Category[] = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Shoes",
  "Accessories",
];

/**
 * Every drawing, grouped by the category it belongs to. Only four of the nine
 * used to be reachable, because the category picked the shape and nothing let
 * you change it — so chinos, trousers and jeans all drew as jeans.
 */
export const SHAPES_BY_CATEGORY: Record<Category, GarmentShape[]> = {
  Tops: ["tee", "shirt", "knit"],
  Bottoms: ["jeans", "shorts", "skirt"],
  Dresses: ["dress"],
  Outerwear: ["jacket", "knit"],
  Shoes: ["sneaker", "boot", "loafer"],
  Accessories: ["bag"],
};

/** What each drawing is called in the picker. */
export const SHAPE_LABEL: Record<GarmentShape, string> = {
  tee: "T-shirt",
  shirt: "Shirt",
  knit: "Knit",
  dress: "Dress",
  jacket: "Jacket",
  jeans: "Trousers",
  skirt: "Skirt",
  shorts: "Shorts",
  sneaker: "Sneaker",
  boot: "Boot",
  loafer: "Loafer",
  bag: "Bag",
};
export const COLOR_NAMES: string[] = Object.keys(SWATCH);
export const WARMTHS: Warmth[] = ["Light", "Medium", "Heavy"];
export const FORMALITIES: Formality[] = [
  "Casual",
  "Athletic",
  "Smart casual",
  "Formal",
];
export const MATERIALS: Material[] = [
  "Cotton",
  "Linen",
  "Denim",
  "Wool",
  "Merino",
  "Nylon",
  "Polyester",
  "Leather",
  "Suede",
  "Mesh",
];

export const swatchFor = (colorName: string) => SWATCH[colorName] ?? "#C4B79C";
