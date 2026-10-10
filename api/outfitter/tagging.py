"""Auto-tagging a photo - notebook cells 7-13.

Florence-2 and rembg are the expensive part of this project: several gigabytes
of weights and a CUDA context. Nothing here is imported until a photo is
actually tagged, so the API starts in a second and serves outfits on a machine
with no GPU at all. `available()` says whether the wheels are even installed,
and the add-item endpoint degrades to the colour reader, or to plain manual
tagging, rather than failing.
"""

from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path
from typing import Any

from .config import FLORENCE_MODEL
from .rules import ALLOWED_CATEGORIES, infer_formality, infer_warmth

_model = None
_processor = None
_rembg_session = None


def _cutout_session():
    """rembg's segmentation model, kept between photos.

    `rembg.remove(image)` builds a new session on every call, which reloads
    u2net from disk each time: 39 seconds a photo, against 4 for Florence-2
    itself. Holding the session makes the cut-out effectively free after the
    first one.
    """
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        _rembg_session = new_session("u2net")
    return _rembg_session


def available() -> dict[str, bool]:
    def has(mod: str) -> bool:
        return importlib.util.find_spec(mod) is not None
    return {
        "florence": has("torch") and has("transformers"),
        "color": has("sklearn") and has("numpy") and has("PIL"),
        "cutout": has("rembg"),
    }


def _load_model():
    """Florence-2, loaded once and kept. First call downloads the weights."""
    global _model, _processor
    if _model is not None:
        return _model, _processor
    import torch
    from transformers import AutoModelForCausalLM, AutoProcessor

    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    _model = AutoModelForCausalLM.from_pretrained(
        FLORENCE_MODEL, torch_dtype=dtype, trust_remote_code=True
    ).to(device)
    _processor = AutoProcessor.from_pretrained(FLORENCE_MODEL, trust_remote_code=True)
    return _model, _processor


def run_florence_tagging(image_path: str | Path) -> str:
    import torch
    from PIL import Image

    model, processor = _load_model()
    device = next(model.parameters()).device
    dtype = next(model.parameters()).dtype

    image = Image.open(image_path).convert("RGB")
    image.thumbnail((768, 768), Image.Resampling.BILINEAR)
    prompt = (
        "Analyze this clothing image and return ONLY valid JSON in this exact shape: "
        '{"category": "top|bottom|dress|outerwear|shoes|accessory", '
        '"subcategory": "", "material": "", "style_tags": []}'
    )
    inputs = processor(text=prompt, images=image, return_tensors="pt").to(device, dtype)
    with torch.no_grad():
        generated = model.generate(
            input_ids=inputs["input_ids"],
            pixel_values=inputs["pixel_values"],
            max_new_tokens=200,
            num_beams=3,
            do_sample=False,
        )
    return processor.batch_decode(generated, skip_special_tokens=True)[0]


def sanitize_model_json(raw_output: Any) -> str:
    text = str(raw_output).strip()
    text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    start, end = text.find("{"), text.rfind("}")
    return text[start:end + 1] if start != -1 and end != -1 else text


def parse_florence_json(raw_output: Any) -> dict[str, Any]:
    """Florence is chatty and not always valid JSON; take what parses."""
    candidate = sanitize_model_json(raw_output)
    try:
        parsed = json.loads(candidate)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", str(raw_output), re.DOTALL)
        if not match:
            return {}
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return {}


def map_to_schema(parsed: dict[str, Any]) -> dict[str, Any]:
    category = str(parsed.get("category", "")).strip().lower()
    if category not in ALLOWED_CATEGORIES:
        category = "top"
    material = str(parsed.get("material", "")).strip().lower() or None
    style_tags = parsed.get("style_tags") or []
    if isinstance(style_tags, str):
        style_tags = [style_tags]
    return {
        "category": category,
        "subcategory": str(parsed.get("subcategory", "")).strip().lower(),
        "material": material,
        "warmth": infer_warmth(material, category),
        "formality": infer_formality(style_tags),
        "waterproof": material in {"nylon", "polyester", "gore-tex"} if material else False,
    }


def extract_color(image_path: str | Path) -> str:
    """The garment's dominant colour - notebook cell 11.

    Lab space rather than RGB so "nearest" means what the eye means, and the
    background is cut away first so a white studio wall is not the answer.
    """
    import numpy as np
    from PIL import Image
    from sklearn.cluster import KMeans

    image = Image.open(image_path).convert("RGB")
    image.thumbnail((256, 256), Image.Resampling.BILINEAR)

    try:
        from rembg import remove
        cut = remove(image, session=_cutout_session())
        rgba = np.array(cut.convert("RGBA"))
        mask = rgba[:, :, 3] > 128
        pixels = rgba[:, :, :3][mask]
    except Exception:
        # No rembg, or it failed on this image: use the middle of the frame,
        # which is where the garment is in every photo in the set.
        arr = np.array(image)
        h, w, _ = arr.shape
        pixels = arr[h // 4: 3 * h // 4, w // 4: 3 * w // 4].reshape(-1, 3)

    if len(pixels) < 16:
        pixels = np.array(image).reshape(-1, 3)

    kmeans = KMeans(n_clusters=min(3, len(pixels)), n_init=4, random_state=0).fit(pixels)
    counts = np.bincount(kmeans.labels_)
    dominant = kmeans.cluster_centers_[counts.argmax()]
    return _nearest_color_name(dominant)


# The palette the wardrobe is already tagged in, so a new piece lands in the
# same vocabulary as the 120 that came before it.
PALETTE = {
    "black": (20, 20, 22), "charcoal": (60, 62, 66), "grey": (142, 146, 153),
    "light-grey": (200, 202, 206), "white": (250, 250, 248), "cream": (243, 236, 222),
    "beige": (225, 210, 188), "camel": (193, 154, 107), "khaki": (168, 152, 110),
    "chocolate": (92, 64, 51), "brown": (122, 84, 51), "terracotta": (186, 98, 66),
    "rust": (168, 85, 47), "salmon": (232, 145, 122), "orange": (222, 122, 48),
    "red": (178, 44, 44), "burgundy": (114, 38, 50), "wine": (98, 34, 48),
    "pink": (232, 168, 186), "dusty-rose": (198, 145, 148), "mauve": (170, 138, 160),
    "sage": (139, 155, 124), "green": (86, 122, 80), "olive": (111, 115, 67),
    "teal": (60, 130, 130), "light-blue": (168, 196, 220), "blue": (64, 100, 168),
    "denim": (78, 106, 142), "navy": (44, 53, 80),
}


def _nearest_color_name(rgb) -> str:
    import numpy as np
    try:
        from skimage.color import rgb2lab

        def to_lab(c):
            return rgb2lab(np.array(c, dtype=float).reshape(1, 1, 3) / 255.0).reshape(3)
    except ImportError:
        def to_lab(c):
            return np.array(c, dtype=float)

    target = to_lab(rgb)
    return min(PALETTE, key=lambda name: float(np.linalg.norm(to_lab(PALETTE[name]) - target)))


def auto_tag_item(image_path: str | Path) -> dict[str, Any]:
    """Everything the tagger can work out about one photo."""
    caps = available()
    tags: dict[str, Any] = {
        "category": "top", "subcategory": "", "material": None,
        "warmth": "medium", "formality": "casual", "waterproof": False,
    }
    notes = []

    if caps["florence"]:
        try:
            tags = map_to_schema(parse_florence_json(run_florence_tagging(image_path)))
        except Exception as exc:  # a failed tag is a blank form, not a 500
            notes.append(f"Florence-2 could not read this photo ({exc.__class__.__name__}).")
    else:
        notes.append("Florence-2 is not installed; tag the piece by hand.")

    if caps["color"]:
        try:
            tags["color_primary"] = extract_color(image_path)
        except Exception as exc:
            notes.append(f"Colour reader failed ({exc.__class__.__name__}).")
    else:
        notes.append("scikit-learn is not installed, so the colour was not read.")

    tags.setdefault("color_primary", None)
    tags["color_secondary"] = None
    tags["notes"] = notes
    return tags
