"""Translating between the engine's vocabulary and the web app's.

The two halves were written apart and named things differently: the notebook
says `top` / `heavy` / `smart-casual`, the web app says `Tops` / `Heavy` /
`Smart casual`. The ladders themselves now match rung for rung, so this is a
rename in both directions and nothing is rounded off on the way through.

Fields the engine has no opinion about - `material`, `shape` - are carried
through untouched so the web app's drawings and pickers keep working for
pieces that have no photo.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

CATEGORY_TO_WEB = {
    "top": "Tops",
    "bottom": "Bottoms",
    "dress": "Dresses",
    "outerwear": "Outerwear",
    "shoes": "Shoes",
    "accessory": "Accessories",
}
CATEGORY_FROM_WEB = {v: k for k, v in CATEGORY_TO_WEB.items()}

WARMTH_TO_WEB = {"light": "Light", "medium": "Medium", "heavy": "Heavy"}
WARMTH_FROM_WEB = {v: k for k, v in WARMTH_TO_WEB.items()}

FORMALITY_TO_WEB = {
    "casual": "Casual",
    "athletic": "Athletic",
    "smart-casual": "Smart casual",
    "formal": "Formal",
}
FORMALITY_FROM_WEB = {v: k for k, v in FORMALITY_TO_WEB.items()}

# What the web app calls a day's slot, and the occasion the engine scores for.
SLOT_KIND_TO_OCCASION = {
    "Gym": "gym",
    "Office": "office",
    "Dinner out": "dinner",
    "Casual": "casual",
    "Travel": "casual",
}

# Only used when a piece has no photo, so the web app can still draw something.
SHAPE_FOR_CATEGORY = {
    "top": "tee",
    "bottom": "jeans",
    "dress": "dress",
    "outerwear": "jacket",
    "shoes": "sneaker",
    "accessory": "bag",
}
SUBCATEGORY_SHAPE = {
    "skirt": "skirt",
    "classic": "shirt",
    "casual": "tee",
    "bohemian": "dress",
    "chic": "shirt",
    "edgy": "jacket",
}


def color_to_web(color: str | None) -> str:
    """`light-grey` -> `Light grey`."""
    if not color:
        return "Unknown"
    words = str(color).replace("_", "-").split("-")
    return " ".join(words).capitalize()


def color_from_web(color: str | None) -> str:
    """`Light grey` -> `light-grey`."""
    return (color or "").strip().lower().replace(" ", "-")


def display_name(item: dict[str, Any]) -> str:
    """A readable name for a piece the tagger never named."""
    if item.get("name"):
        return str(item["name"])
    colour = color_to_web(item.get("color_primary"))
    noun = {
        "top": "top", "bottom": "bottoms", "dress": "dress",
        "outerwear": "jacket", "shoes": "shoes", "accessory": "accessory",
    }.get(item.get("category", ""), "piece")
    sub = (item.get("subcategory") or "").strip()
    if sub and sub not in ("casual", "classic"):
        noun = sub
    return f"{colour} {noun}".strip()


def _to_epoch_ms(value: Any) -> int | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(datetime.fromisoformat(str(value)).timestamp() * 1000)
    except ValueError:
        return None


def _from_epoch_ms(value: Any) -> str | None:
    if value in (None, ""):
        return None
    try:
        return datetime.fromtimestamp(float(value) / 1000).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def item_to_web(item: dict[str, Any]) -> dict[str, Any]:
    category = item.get("category", "accessory")
    shape = item.get("shape") or SUBCATEGORY_SHAPE.get(
        (item.get("subcategory") or "").lower()
    ) or SHAPE_FOR_CATEGORY.get(category, "tee")
    return {
        "id": item["id"],
        "name": display_name(item),
        "cat": CATEGORY_TO_WEB.get(category, "Accessories"),
        "shape": shape,
        "colorName": color_to_web(item.get("color_primary")),
        "warmth": WARMTH_TO_WEB.get((item.get("warmth") or "medium").lower(), "Medium"),
        "formality": FORMALITY_TO_WEB.get((item.get("formality") or "casual").lower(), "Casual"),
        "material": item.get("material"),
        "waterproof": bool(item.get("waterproof")),
        "lastWorn": _to_epoch_ms(item.get("last_worn_at")),
        "photo": f"/api/media/{item['photo']}" if item.get("photo") else None,
        "subcategory": item.get("subcategory") or "",
    }


def item_from_web(payload: dict[str, Any], existing: dict[str, Any] | None = None) -> dict[str, Any]:
    """Fold a web-shaped patch back onto an engine item."""
    item = dict(existing or {})
    if "name" in payload:
        item["name"] = payload["name"]
    if "cat" in payload:
        item["category"] = CATEGORY_FROM_WEB.get(payload["cat"], "accessory")
    if "shape" in payload:
        item["shape"] = payload["shape"]
    if "colorName" in payload:
        item["color_primary"] = color_from_web(payload["colorName"])
    if "warmth" in payload:
        item["warmth"] = WARMTH_FROM_WEB.get(payload["warmth"], "medium")
    if "formality" in payload:
        item["formality"] = FORMALITY_FROM_WEB.get(payload["formality"], "casual")
    if "material" in payload:
        item["material"] = payload["material"]
    if "waterproof" in payload:
        item["waterproof"] = bool(payload["waterproof"])
    if "lastWorn" in payload:
        item["last_worn_at"] = _from_epoch_ms(payload["lastWorn"])
    if "photo" in payload and payload["photo"]:
        item["photo"] = str(payload["photo"]).rsplit("/", 1)[-1]
    item.setdefault("subcategory", payload.get("subcategory", ""))
    item.setdefault("color_secondary", None)
    item.setdefault("last_worn_at", None)
    item.setdefault("waterproof", False)
    return item


def combo_to_web(combo: dict[str, Any], score: float, rank: int,
                 weather: dict[str, Any], occasion_type: str) -> dict[str, Any]:
    order = ("dress", "top", "bottom", "outerwear", "shoes")
    pieces = [combo[k] for k in order if combo.get(k)]
    return {
        "id": "-".join(p["id"] for p in pieces),
        "ids": [p["id"] for p in pieces],
        "rank": ["Best", "Runner-up", "Also good"][rank] if rank < 3 else f"Option {rank + 1}",
        "score": round(score, 3),
        "items": [item_to_web(p) for p in pieces],
        "note": _note(combo, weather, occasion_type),
    }


def _note(combo: dict[str, Any], weather: dict[str, Any], occasion_type: str) -> str:
    """One line on why this outfit, in the app's voice."""
    temp = round(weather.get("temp", 0))
    rain = weather.get("rain_probability") or 0
    bits = [f"{temp}°C"]
    if rain > 50:
        bits.append("rain likely")
    elif rain > 20:
        bits.append(f"{round(rain)}% rain")
    outer = combo.get("outerwear")
    if outer:
        bits.append(f"layered under {display_name(outer).lower()}")
    label = {"gym": "the gym", "office": "the office", "dinner": "dinner out"}.get(
        occasion_type, "a casual day"
    )
    return f"For {label} · " + ", ".join(bits)
