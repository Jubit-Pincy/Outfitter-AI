/**
 * The shapes the app and the engine agree on.
 *
 * These used to be the prototype's own vocabulary. Now that the Python engine
 * in `api/` decides what to wear, the ladders here are its ladders, rung for
 * rung — `Heavy` is its `heavy`, `Smart casual` is its `smart-casual` — so a
 * piece survives the round trip without being rounded off. The renaming lives
 * in `api/outfitter/webschema.py`, in one place, in both directions.
 */

export type Category =
  | "Tops"
  | "Bottoms"
  | "Dresses"
  | "Outerwear"
  | "Shoes"
  | "Accessories";

export type GarmentShape =
  | "tee"
  | "shirt"
  | "knit"
  | "dress"
  | "jacket"
  | "jeans"
  | "skirt"
  | "shorts"
  | "sneaker"
  | "boot"
  | "loafer"
  | "bag";

/** The engine's three-step insulation scale. */
export type Warmth = "Light" | "Medium" | "Heavy";

export type Formality = "Casual" | "Athletic" | "Smart casual" | "Formal";

export type Material =
  | "Cotton"
  | "Linen"
  | "Denim"
  | "Wool"
  | "Merino"
  | "Nylon"
  | "Polyester"
  | "Leather"
  | "Suede"
  | "Mesh";

export type SlotKind = "Gym" | "Office" | "Casual" | "Dinner out" | "Travel";

export const SLOT_KINDS: SlotKind[] = [
  "Gym",
  "Office",
  "Casual",
  "Dinner out",
  "Travel",
];

export interface Item {
  id: string;
  name: string;
  cat: Category;
  shape: GarmentShape;
  colorName: string;
  warmth: Warmth;
  formality: Formality;
  /**
   * The tagger reads a material off the photo when it can, and the engine uses
   * it to infer warmth — but it is never certain, so a piece may have none.
   */
  material: Material | null;
  /** Whether the piece sheds rain. The engine drops outerwear that does not. */
  waterproof: boolean;
  /**
   * When the piece was last worn, as an epoch millisecond stamp; `null` means
   * never. A stamp rather than prose, so the rest period can be measured.
   */
  lastWorn: number | null;
  /** The photo it was tagged from, served by the API. Seeded pieces all have one. */
  photo: string | null;
  /** Florence-2's finer read: "skirt", "classic", "bohemian". Often empty. */
  subcategory?: string;
}

export interface Slot {
  id: string;
  time: string;
  kind: SlotKind;
}

export interface Outfit {
  id: string;
  ids: string[];
  rank: string;
  note: string;
}

/** One occasion's answer, as the engine returns it. */
export interface Pick {
  slotId: string | null;
  kind: SlotKind;
  time: string;
  occasionType: string;
  wants: { formality: string; warmth: string };
  weather: { temp: number; rainProbability: number };
  /** How many pieces were eligible, and how many outfits were built from them. */
  considered: number;
  combosBuilt: number;
  outfits: (Outfit & { score: number; items: Item[] })[];
}

export interface Settings {
  location: string;
  /** Set when the browser has given us a position; cleared by typing a place. */
  coords?: { lat: number; lon: number };
  units: "Celsius" | "Fahrenheit";
  restDays: number;
  formalityMap: Partial<Record<SlotKind, Formality>>;
  /** Both come from the signed-in account, not from a seed file. */
  email: string;
  name: string;
}

export interface Account {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  settings: Settings;
}

/** The editable tag fields shared by the edit and add flows. */
export type EditableKey =
  | "name"
  | "cat"
  | "shape"
  | "colorName"
  | "material"
  | "warmth"
  | "formality";
