"""Scoring an outfit - notebook cells 27 and 32-38.

The weights, the colour wheel and every individual score are the notebook's,
unchanged. What changed is the shape of a "combo":

  The notebook built combos with `product(tops, bottoms, dresses, outerwear,
  shoes)`, which dresses you in a top *and* trousers *and* a dress at once,
  and refuses to suggest anything at all when one of those lists is empty.
  A combo here is either a top with a bottom, or a dress - never both - each
  with optional outerwear and shoes. `score_combo` was reading
  `combo["top"]["color_primary"]` unconditionally, which a dress outfit would
  have crashed on; it now reads whichever two pieces are present.
"""

from __future__ import annotations

from datetime import datetime
from itertools import product
from typing import Any

from .rules import (
    WARMTH_ORDER,
    WRONG_KIND,
    formality_distance,
    formality_for,
    map_temp_to_warmth,
)

Combo = dict[str, Any]

NEUTRALS = {"black", "white", "grey", "beige", "navy", "cream", "charcoal",
            "light-grey", "off-white", "ivory", "stone"}

# Angular position on a simplified 12-colour wheel.
COLOR_WHEEL = {
    "red": 0, "orange": 1, "terracotta": 1, "salmon": 1, "rust": 1,
    "yellow": 2, "khaki": 2, "camel": 2, "gold": 2,
    "olive": 3, "green": 4, "sage": 4, "teal": 5,
    "light-blue": 6, "blue": 6, "denim": 6, "navy": 7,
    "purple": 8, "mauve": 8, "wine": 9, "burgundy": 9,
    "pink": 10, "dusty-rose": 10, "brown": 11, "chocolate": 11, "tan": 11,
}

WARM_COLORS = {"red", "orange", "yellow", "brown", "pink", "terracotta",
               "salmon", "camel", "chocolate", "rust", "khaki", "dusty-rose"}
COOL_COLORS = {"blue", "navy", "green", "teal", "purple", "sage", "denim",
               "light-blue", "mauve"}

WEIGHTS = {"color": 1.0, "temp": 1.5, "layering": 0.8, "occasion": 1.2, "recency": 1.0}

COOLDOWN_DAYS = 7
OVERLAP_PENALTY = 0.5

# Pre-trimming each category before the cross product. 21 tops x 18 bottoms x
# 16 outerwear x 14 shoes is 84,672 combos for one occasion; ranking each
# category on its own fit first gets the same winners out of a few thousand.
MAX_PER_CATEGORY = 10


def color_compatibility_score(color_a: str | None, color_b: str | None) -> float:
    a, b = (color_a or "").lower(), (color_b or "").lower()
    if not a or not b:
        return 0.5
    if a in NEUTRALS or b in NEUTRALS:
        return 1.0
    if a == b:
        return 0.9
    pos_a, pos_b = COLOR_WHEEL.get(a), COLOR_WHEEL.get(b)
    if pos_a is None or pos_b is None:
        return 0.5
    distance = min(abs(pos_a - pos_b), 12 - abs(pos_a - pos_b))
    if distance <= 1:          # neighbours on the wheel
        return 0.85
    if distance >= 5:          # complementary
        return 0.8
    if a in WARM_COLORS and b in WARM_COLORS:
        return 0.7
    if a in COOL_COLORS and b in COOL_COLORS:
        return 0.7
    return 0.4


def _warmth_idx(item: dict | None) -> int | None:
    if not item:
        return None
    w = (item.get("warmth") or "medium").lower()
    return WARMTH_ORDER.index(w) if w in WARMTH_ORDER else 1


def combo_warmth_level(combo: Combo) -> float:
    levels = [_warmth_idx(combo.get(k)) for k in ("top", "bottom", "dress", "outerwear")]
    levels = [x for x in levels if x is not None]
    return sum(levels) / len(levels) if levels else 1.0


def temperature_fit_score(combo: Combo, weather: dict[str, Any]) -> float:
    required = WARMTH_ORDER.index(map_temp_to_warmth(weather["temp"]))
    actual = combo_warmth_level(combo)
    max_distance = len(WARMTH_ORDER) - 1
    return max(0.0, 1 - abs(actual - required) / max_distance)


def layering_score(combo: Combo) -> float:
    """Whether the layers make sense together. No outerwear is neutral, not wrong."""
    inner = combo.get("top") or combo.get("dress")
    outer = combo.get("outerwear")
    if inner is None or outer is None:
        return 0.5
    inner_idx, outer_idx = _warmth_idx(inner), _warmth_idx(outer)
    if inner_idx == 2 and outer_idx == 2:      # heavy under heavy
        return 0.2
    if inner_idx == 2 and outer_idx == 1:      # heavy under medium
        return 0.6
    if inner_idx == 0 and outer_idx == 2:      # light under heavy
        return 1.0
    return 0.8


def occasion_fit_score(combo: Combo, occasion_type: str,
                       required_formality: str | None = None) -> float:
    """How well dressed for the occasion, on `rules.formality_distance`.

    The notebook subtracted indices in FORMALITY_ORDER, which scored a
    smart-casual blouse and a cotton tee identically for the gym.
    """
    required = formality_for(occasion_type, required_formality)
    items = [combo[k] for k in ("top", "bottom", "dress", "outerwear", "shoes") if combo.get(k)]
    if not items:
        return 0.0
    distances = [formality_distance(i.get("formality"), required) for i in items]
    return max(0.0, 1 - (sum(distances) / len(distances)) / WRONG_KIND)


def recency_penalty(item: dict | None, cooldown_days: int = COOLDOWN_DAYS) -> float:
    """1.0 for worn today, easing to 0 over the cooldown. Never worn is free."""
    if not item:
        return 0.0
    last_worn = item.get("last_worn_at")
    if last_worn in (None, "", "none", "None"):
        return 0.0
    if isinstance(last_worn, str):
        try:
            last_worn = datetime.fromisoformat(last_worn)
        except ValueError:
            return 0.0
    if not isinstance(last_worn, datetime):
        return 0.0
    days_since = (datetime.now() - last_worn).days
    return max(0.0, 1 - days_since / max(cooldown_days, 1))


def score_combo(combo: Combo, weather: dict[str, Any], occasion_type: str,
                cooldown_days: int = COOLDOWN_DAYS,
                required_formality: str | None = None) -> float:
    # A dress outfit has no top/bottom pair, so the colour pairing is read from
    # whichever two pieces the outfit actually has.
    if combo.get("dress"):
        pair = (combo["dress"], combo.get("outerwear") or combo.get("shoes"))
    else:
        pair = (combo.get("top"), combo.get("bottom"))
    color_score = color_compatibility_score(
        (pair[0] or {}).get("color_primary"), (pair[1] or {}).get("color_primary")
    )
    recency = sum(recency_penalty(combo.get(k), cooldown_days)
                  for k in ("top", "bottom", "dress", "outerwear", "shoes"))
    return (
        WEIGHTS["color"] * color_score
        + WEIGHTS["temp"] * temperature_fit_score(combo, weather)
        + WEIGHTS["layering"] * layering_score(combo)
        + WEIGHTS["occasion"] * occasion_fit_score(combo, occasion_type, required_formality)
        - WEIGHTS["recency"] * recency
    )


def split_by_category(items: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {k: [] for k in
                                  ("top", "bottom", "dress", "outerwear", "shoes", "accessory")}
    for item in items:
        out.setdefault(item.get("category", "accessory"), []).append(item)
    return out


def _shortlist(items: list[dict], weather: dict, occasion_type: str, limit: int,
               required_formality: str | None = None) -> list[dict]:
    """The best `limit` pieces on their own merits, before pairing."""
    if len(items) <= limit:
        return items

    def solo(item: dict) -> float:
        one = {item.get("category", "top"): item}
        return (
            WEIGHTS["temp"] * temperature_fit_score(one, weather)
            + WEIGHTS["occasion"] * occasion_fit_score(one, occasion_type, required_formality)
            - WEIGHTS["recency"] * recency_penalty(item)
        )

    return sorted(items, key=solo, reverse=True)[:limit]


def generate_combos(categorized: dict[str, list[dict]], weather: dict,
                    occasion_type: str, limit: int = MAX_PER_CATEGORY,
                    required_formality: str | None = None) -> list[Combo]:
    """Every wearable outfit: a top with a bottom, or a dress. Never both."""
    def pick(key: str) -> list[dict]:
        return _shortlist(categorized.get(key, []), weather, occasion_type, limit,
                          required_formality)

    tops, bottoms, dresses = pick("top"), pick("bottom"), pick("dress")
    outerwear: list[dict | None] = [*pick("outerwear"), None]
    shoes: list[dict | None] = [*pick("shoes"), None]

    combos: list[Combo] = []
    for top, bottom, outer, shoe in product(tops, bottoms, outerwear, shoes):
        combos.append({"top": top, "bottom": bottom, "dress": None,
                       "outerwear": outer, "shoes": shoe})
    for dress, outer, shoe in product(dresses, outerwear, shoes):
        combos.append({"top": None, "bottom": None, "dress": dress,
                       "outerwear": outer, "shoes": shoe})
    return combos


CORE = ("dress", "top", "bottom")


def _piece_ids(combo: Combo) -> set[str]:
    return {combo[k]["id"] for k in ("top", "bottom", "dress", "outerwear", "shoes")
            if combo.get(k)}


def _core_ids(combo: Combo) -> set[str]:
    """The pieces that make an outfit a different outfit, rather than a variant."""
    return {combo[k]["id"] for k in CORE if combo.get(k)}


def select_top_combos(combos: list[Combo], weather: dict, occasion_type: str,
                      n: int = 2, cooldown_days: int = COOLDOWN_DAYS,
                      required_formality: str | None = None
                      ) -> list[tuple[Combo, float]]:
    """The best `n`, each a genuinely different outfit from the ones above it.

    The notebook appended candidates whether or not they overlapped and only
    adjusted the score afterwards, so the runner-up was reliably the winner
    wearing a different shoe. Repeating outerwear or shoes is merely penalised;
    repeating the top, the bottom or the dress disqualifies a candidate on the
    first pass, because that is the same outfit.

    The second pass exists for a small or narrow wardrobe - five formal pieces
    and nothing else - where there is no second distinct outfit to be had. A
    near-repeat beats an empty slot there, so long as it is not the very same
    set of pieces.
    """
    if not combos:
        return []
    scored = sorted(
        ((c, score_combo(c, weather, occasion_type, cooldown_days, required_formality))
         for c in combos),
        key=lambda x: x[1], reverse=True,
    )

    selected: list[tuple[Combo, float]] = []
    used_core: set[str] = set()
    used_any: set[str] = set()
    for combo, base in scored:
        if len(selected) >= n:
            break
        core = _core_ids(combo)
        if core & used_core:
            continue
        pieces = _piece_ids(combo)
        selected.append((combo, base - OVERLAP_PENALTY * len(pieces & used_any)))
        used_core |= core
        used_any |= pieces

    if len(selected) < n:
        seen = {frozenset(_piece_ids(c)) for c, _ in selected}
        for combo, base in scored:
            if len(selected) >= n:
                break
            pieces = _piece_ids(combo)
            if frozenset(pieces) in seen:
                continue
            selected.append((combo, base - OVERLAP_PENALTY * len(pieces & used_any)))
            seen.add(frozenset(pieces))
            used_any |= pieces

    return selected[:n]
