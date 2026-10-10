"""The Outfitter AI HTTP service.

Everything the notebook could do, behind routes the web app can call:
sign in, read and edit a wardrobe, auto-tag a photo, and ask for today's two
outfits. Run it with

    uvicorn main:app --reload --port 8000

The web app never talks to this port directly - it proxies through its own
`/api/...` routes - so the session cookie stays same-origin and there is no
CORS to configure. The permissive CORS below is only so you can poke at the
service from a REST client while developing.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field

from outfitter import store, tagging
from outfitter.config import SESSION_DAYS, UPLOAD_DIR
from outfitter.rules import filter_items_for_occasion, formality_for, map_temp_to_warmth
from outfitter.scoring import generate_combos, select_top_combos, split_by_category
from outfitter.webschema import (
    FORMALITY_FROM_WEB,
    SLOT_KIND_TO_OCCASION,
    combo_to_web,
    item_from_web,
    item_to_web,
)

SESSION_COOKIE = "outfitter_session"

app = FastAPI(title="Outfitter AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    store.init_db()


# --------------------------------------------------------------------------
# Request bodies
# --------------------------------------------------------------------------

class SignupBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ProfileBody(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    email: EmailStr | None = None
    settings: dict[str, Any] | None = None


class PasswordBody(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8, max_length=200)


class ItemBody(BaseModel):
    name: str | None = None
    cat: str | None = None
    shape: str | None = None
    colorName: str | None = None
    warmth: str | None = None
    formality: str | None = None
    material: str | None = None
    waterproof: bool | None = None
    lastWorn: int | None = None
    photo: str | None = None
    subcategory: str | None = None


class SlotBody(BaseModel):
    time: str
    kind: str


class OccasionBody(BaseModel):
    """One thing on the day, and the weather the app already has for it."""
    id: str | None = None
    kind: str = "Casual"
    time: str = "09:00"
    temp: float
    rainProbability: float = 0.0
    # "Gym counts as ..." from Settings, in the web app's words. Left out, the
    # engine falls back to its own OCCASION_FORMALITY.
    formality: str | None = None


class PicksBody(BaseModel):
    occasions: list[OccasionBody]
    perOccasion: int = Field(default=2, ge=1, le=6)
    restDays: int | None = Field(default=None, ge=0, le=60)


class WornBody(BaseModel):
    ids: list[str]


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------

def current_user(request: Request) -> dict[str, Any]:
    user = store.user_for_session(request.cookies.get(SESSION_COOKIE))
    if user is None:
        raise HTTPException(status_code=401, detail="Not signed in")
    return user


def _set_session(response: Response, user_id: int) -> None:
    token, _ = store.create_session(user_id)
    response.set_cookie(
        SESSION_COOKIE, token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True, samesite="lax", path="/",
    )


@app.post("/auth/signup")
def signup(body: SignupBody, response: Response):
    if store.get_user_by_email(body.email) is not None:
        raise HTTPException(status_code=409, detail="That email already has an account")
    user = store.create_user(str(body.email), body.name, body.password)
    _set_session(response, user["id"])
    return {"user": user}


@app.post("/auth/login")
def login(body: LoginBody, response: Response):
    row = store.get_user_by_email(body.email)
    # One message for both halves, so the form cannot be used to find out
    # which addresses have accounts.
    invalid = HTTPException(status_code=401, detail="That email and password do not match")
    if row is None:
        # Still do the work, so a missing account is not merely faster.
        store.hash_password(body.password)
        raise invalid
    if not store.verify_password(body.password, row["pw_salt"], row["pw_hash"]):
        raise invalid
    _set_session(response, row["id"])
    return {"user": store.get_user(row["id"])}


@app.post("/auth/logout")
def logout(request: Request, response: Response):
    store.delete_session(request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/auth/me")
def me(user: dict = Depends(current_user)):
    return {"user": user}


@app.patch("/auth/me")
def update_me(body: ProfileBody, user: dict = Depends(current_user)):
    if body.email and str(body.email).lower() != user["email"].lower():
        clash = store.get_user_by_email(str(body.email))
        if clash is not None and clash["id"] != user["id"]:
            raise HTTPException(status_code=409, detail="That email already has an account")
    updated = store.update_user(
        user["id"], name=body.name,
        email=str(body.email) if body.email else None,
        settings=body.settings,
    )
    return {"user": updated}


@app.post("/auth/password")
def change_password(body: PasswordBody, user: dict = Depends(current_user)):
    row = store.get_user_by_email(user["email"])
    if row is None or not store.verify_password(body.currentPassword, row["pw_salt"], row["pw_hash"]):
        raise HTTPException(status_code=401, detail="Current password is wrong")
    store.set_password(user["id"], body.newPassword)
    return {"ok": True}


# --------------------------------------------------------------------------
# Wardrobe
# --------------------------------------------------------------------------

@app.get("/items")
def get_items(user: dict = Depends(current_user)):
    return {"items": [item_to_web(i) for i in store.list_items(user["id"])]}


@app.post("/items")
def create_item(body: ItemBody, user: dict = Depends(current_user)):
    item = item_from_web(body.model_dump(exclude_none=True))
    item["id"] = uuid.uuid4().hex[:8]
    item.setdefault("category", "top")
    store.put_item(user["id"], item)
    return {"item": item_to_web(item)}


@app.patch("/items/{item_id}")
def edit_item(item_id: str, body: ItemBody, user: dict = Depends(current_user)):
    existing = store.get_item(user["id"], item_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="No such item")
    merged = item_from_web(body.model_dump(exclude_unset=True), existing)
    merged["id"] = item_id
    store.put_item(user["id"], merged)
    return {"item": item_to_web(merged)}


@app.delete("/items/{item_id}")
def remove_item(item_id: str, user: dict = Depends(current_user)):
    if not store.delete_item(user["id"], item_id):
        raise HTTPException(status_code=404, detail="No such item")
    return {"ok": True}


@app.post("/items/worn")
def wear_items(body: WornBody, user: dict = Depends(current_user)):
    store.mark_worn(user["id"], body.ids)
    return {"items": [item_to_web(i) for i in store.list_items(user["id"])]}


@app.get("/media/{filename}")
def media(filename: str):
    """A wardrobe photo. The name is taken apart so a path cannot escape the folder."""
    safe = Path(filename).name
    path = UPLOAD_DIR / safe
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No such photo")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@app.get("/tagging/status")
def tagging_status():
    return {"available": tagging.available()}


@app.post("/tagging")
async def tag_photo(file: UploadFile = File(...), user: dict = Depends(current_user)):
    """Save an uploaded photo and hand back what the tagger made of it."""
    suffix = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=415, detail="Photos only: jpg, png or webp")
    name = f"upload-{uuid.uuid4().hex[:10]}{suffix}"
    target = UPLOAD_DIR / name
    target.write_bytes(await file.read())

    tags = tagging.auto_tag_item(target)
    draft = {**tags, "id": uuid.uuid4().hex[:8], "photo": name, "name": None}
    return {"draft": item_to_web(draft), "photo": f"/api/media/{name}", "notes": tags.get("notes", [])}


# --------------------------------------------------------------------------
# The day
# --------------------------------------------------------------------------

@app.get("/schedule")
def get_schedule(user: dict = Depends(current_user)):
    return {"schedule": store.list_slots(user["id"])}


@app.post("/schedule")
def post_slot(body: SlotBody, user: dict = Depends(current_user)):
    existing = store.list_slots(user["id"])
    if any(s["time"] == body.time and s["kind"] == body.kind for s in existing):
        raise HTTPException(status_code=409, detail="That slot is already on the day")
    store.add_slot(user["id"], f"slot-{uuid.uuid4().hex[:8]}", body.time, body.kind)
    return {"schedule": store.list_slots(user["id"])}


@app.delete("/schedule/{slot_id}")
def remove_slot(slot_id: str, user: dict = Depends(current_user)):
    if not store.delete_slot(user["id"], slot_id):
        raise HTTPException(status_code=404, detail="No such slot")
    return {"schedule": store.list_slots(user["id"])}


# --------------------------------------------------------------------------
# What to wear
# --------------------------------------------------------------------------

@app.post("/picks")
def picks(body: PicksBody, user: dict = Depends(current_user)):
    """The notebook's whole pipeline, per occasion: filter, combine, score, pick.

    The weather arrives with the request because the web app has already
    fetched it - the same numbers the sky on screen was painted from, so the
    reason under an outfit matches what the person is looking at.
    """
    items = store.list_items(user["id"])
    cooldown = body.restDays if body.restDays is not None else user["settings"].get("restDays", 7)

    out = []
    for occ in body.occasions:
        occasion_type = SLOT_KIND_TO_OCCASION.get(occ.kind, "casual")
        weather = {"temp": occ.temp, "rain_probability": occ.rainProbability}
        wanted = formality_for(occasion_type, FORMALITY_FROM_WEB.get(occ.formality or ""))

        eligible = filter_items_for_occasion(items, occasion_type, weather, wanted)
        combos = generate_combos(split_by_category(eligible), weather, occasion_type,
                                 required_formality=wanted)
        chosen = select_top_combos(combos, weather, occasion_type, n=body.perOccasion,
                                   cooldown_days=max(cooldown, 1), required_formality=wanted)

        out.append({
            "slotId": occ.id,
            "kind": occ.kind,
            "time": occ.time,
            "occasionType": occasion_type,
            "wants": {"formality": wanted, "warmth": map_temp_to_warmth(occ.temp)},
            "weather": {"temp": occ.temp, "rainProbability": occ.rainProbability},
            "considered": len(eligible),
            "combosBuilt": len(combos),
            "outfits": [combo_to_web(c, s, i, weather, occasion_type)
                        for i, (c, s) in enumerate(chosen)],
        })
    return {"picks": out, "generatedAt": datetime.now().isoformat()}


@app.get("/health")
def health():
    return {"ok": True, "items": ITEMS_SEEDED, "tagging": tagging.available()}


ITEMS_SEEDED = len(store.load_seed_items())
