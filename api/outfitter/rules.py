"""Ladders, maps and the occasion filter — notebook cells 12 and 24-26.

Two things differ from the notebook, both because a real wardrobe broke it:

1. The formality filter was an exact match. With the 120 tagged items that
   leaves `gym` with no tops at all and `office` with no bottoms, so both
   screens rendered nothing. It now accepts one step either way on the ladder,
   the same tolerance the notebook already allowed for warmth — and
   `scoring.occasion_fit_score` still pushes the exact match to the top.
2. `waterproof` is only consulted when it is actually known.
"""

from __future__ import annotations

from typing import Any, Iterable

# The notebook's ladder, kept for the order things are listed in.
FORMALITY_ORDER = ["casual", "athletic", "smart-casual", "formal"]

# How far apart two formalities really are.
#
# The notebook measured this as distance along FORMALITY_ORDER, which puts
# "athletic" between casual and smart-casual and so makes a smart-casual blouse
# exactly as gym-appropriate as a cotton tee - that is how a silk blouse and a
# blazer came to be suggested for the gym.
#
# Dressiness is a line: casual -> smart-casual -> formal. Sportswear is not a
# point on it. It is a different kind of clothing that happens to be informal,
# so the only thing near it is casual, and everything dressier is simply wrong.
DRESSINESS = {"casual": 0, "smart-casual": 1, "formal": 2}
WRONG_KIND = 3  # athletic against anything dressier, in either direction


def formality_distance(item_formality: str, required: str) -> int:
    """How wrong a piece is for the occasion. 0 is exactly right."""
    item = (item_formality or "casual").lower()
    required = (required or "casual").lower()
    if item == required:
        return 0
    if item == "athletic" or required == "athletic":
        other = required if item == "athletic" else item
        return 1 if other == "casual" else WRONG_KIND
    if item not in DRESSINESS or required not in DRESSINESS:
        return 1
    return abs(DRESSINESS[item] - DRESSINESS[required])
WARMTH_ORDER = ["light", "medium", "heavy"]

OCCASION_FORMALITY = {
    "gym": "athletic",
    "office": "smart-casual",
    "dinner": "formal",
    "casual": "casual",
}

RAIN_THRESHOLD = 50
FORMALITY_TOLERANCE = 1
WARMTH_TOLERANCE = 1

ALLOWED_CATEGORIES = {"top", "bottom", "dress", "outerwear", "shoes", "accessory"}

WARM_MATERIALS = {"wool", "fleece", "down", "leather", "denim"}
LIGHT_MATERIALS = {"cotton", "linen", "silk", "polyester-mesh"}
FORMAL_STYLE_KEYWORDS = {"blazer", "suit", "dress-shirt", "trouser", "formal"}
ATHLETIC_STYLE_KEYWORDS = {"sport", "athletic", "gym", "activewear", "track"}


def map_temp_to_warmth(temp_celsius: float) -> str:
    """How much insulation the air calls for."""
    if temp_celsius >= 22:
        return "light"
    if temp_celsius >= 12:
        return "medium"
    return "heavy"


def _within(order: list[str], value: str, required: str, tolerance: int) -> bool:
    if value not in order or required not in order:
        return True  # an unknown tag is not evidence against the piece
    return abs(order.index(value) - order.index(required)) <= tolerance


def warmth_is_acceptable(item_warmth: str, required_warmth: str, tolerance: int = WARMTH_TOLERANCE) -> bool:
    return _within(WARMTH_ORDER, item_warmth, required_warmth, tolerance)


def formality_is_acceptable(item_formality: str, required: str,
                            tolerance: int = FORMALITY_TOLERANCE) -> bool:
    """Close enough to wear. Gym therefore reaches casual, but never a blazer."""
    return formality_distance(item_formality, required) <= tolerance


def infer_warmth(material: str | None, category: str | None) -> str:
    material = (material or "").lower()
    if material in WARM_MATERIALS:
        return "heavy"
    if material in LIGHT_MATERIALS:
        return "light"
    if (category or "").lower() == "outerwear":
        return "heavy"
    return "medium"


def infer_formality(style_tags: Iterable[str] | None) -> str:
    tags = {str(t).lower() for t in (style_tags or [])}
    if tags & FORMAL_STYLE_KEYWORDS:
        return "formal"
    if tags & ATHLETIC_STYLE_KEYWORDS:
        return "athletic"
    if "smart-casual" in tags or "smart casual" in tags:
        return "smart-casual"
    return "casual"


def formality_for(occasion_type: str, override: str | None = None) -> str:
    """What the occasion asks to be dressed for.

    OCCASION_FORMALITY is the notebook's default. The override is the person's
    own answer from Settings - "Gym counts as ..." - which has to win, or that
    control would be decoration.
    """
    if override in FORMALITY_ORDER:
        return override  # type: ignore[return-value]
    return OCCASION_FORMALITY.get(occasion_type, "casual")


def filter_items_for_occasion(
    items: list[dict[str, Any]],
    occasion_type: str,
    weather: dict[str, Any],
    required_formality: str | None = None,
) -> list[dict[str, Any]]:
    """Everything that could plausibly be worn to this occasion, in this weather."""
    required_formality = formality_for(occasion_type, required_formality)
    required_warmth = map_temp_to_warmth(weather["temp"])
    wet = (weather.get("rain_probability") or 0) > RAIN_THRESHOLD

    kept = []
    for item in items:
        if not formality_is_acceptable(item.get("formality", "casual"), required_formality):
            continue
        # Rain rules out outerwear that is known not to shed it.
        if wet and item.get("category") == "outerwear" and item.get("waterproof") is False:
            continue
        if item.get("category") in ("top", "bottom", "outerwear", "dress"):
            if not warmth_is_acceptable(item.get("warmth", "medium"), required_warmth):
                continue
        kept.append(item)
    return kept
