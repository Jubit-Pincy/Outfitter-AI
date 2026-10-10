"""Where the wardrobe, the accounts and the schedules are kept.

The notebook held the wardrobe in a pandas DataFrame backed by
`Images/items.json`. That file is still the starter wardrobe every new account
is given a copy of - it is read, never written, so the notebook keeps working
exactly as it did. Everything a signed-in person then changes lives in
`api/data/outfitter.db`.

Passwords are hashed with scrypt from the standard library: no wheel to
install, and a real KDF rather than a bare digest.
"""

from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

from .config import DB_FILE, ITEMS_FILE, SESSION_DAYS, UPLOAD_DIR

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT NOT NULL,
  pw_salt    TEXT NOT NULL,
  pw_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settings   TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
  id       TEXT NOT NULL,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data     TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS slots (
  id       TEXT NOT NULL,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time     TEXT NOT NULL,
  kind     TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS items_by_user ON items(user_id);
CREATE INDEX IF NOT EXISTS slots_by_user ON slots(user_id);
"""

DEFAULT_SETTINGS: dict[str, Any] = {
    "location": "Jaipur",
    "units": "Celsius",
    "restDays": 5,
    # The web app's names for the engine's ladder. These are what
    # OCCASION_FORMALITY says by default; the person can change any of them in
    # Settings and /picks honours the change.
    "formalityMap": {"Gym": "Athletic", "Office": "Smart casual",
                     "Casual": "Casual", "Dinner out": "Formal",
                     "Travel": "Casual"},
}

# The day the notebook assumed when it had no calendar to read.
DEFAULT_SCHEDULE = [
    {"id": "slot-office", "time": "09:30", "kind": "Office"},
    {"id": "slot-gym", "time": "18:30", "kind": "Gym"},
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


# --------------------------------------------------------------------------
# The starter wardrobe
# --------------------------------------------------------------------------

def _photo_name(image_path: str) -> str:
    """`./Images/uploads\\Womens_casual_top2.jpg` -> `Womens_casual_top2.jpg`.

    items.json was written on Windows through a POSIX-style join, so the
    separators in it are mixed. Only the filename matters: the API serves the
    photo from UPLOAD_DIR by name.
    """
    return Path(str(image_path).replace("\\", "/")).name


def load_seed_items() -> list[dict[str, Any]]:
    """The notebook's tagged wardrobe, as plain dicts."""
    if not ITEMS_FILE.exists():
        return []
    raw = json.loads(ITEMS_FILE.read_text(encoding="utf-8"))
    items = []
    for row in raw:
        photo = _photo_name(row.get("image_path", ""))
        if not (UPLOAD_DIR / photo).exists():
            continue  # a tag with no photo behind it is not a garment
        items.append({
            "id": row["id"],
            "photo": photo,
            "category": row.get("category") or "accessory",
            "subcategory": row.get("subcategory") or "",
            "color_primary": row.get("color_primary"),
            "color_secondary": row.get("color_secondary"),
            "warmth": row.get("warmth") or "medium",
            "formality": row.get("formality") or "casual",
            "waterproof": bool(row.get("waterproof")),
            "last_worn_at": row.get("last_worn_at"),
            "name": None,
        })
    return items


# --------------------------------------------------------------------------
# Accounts
# --------------------------------------------------------------------------

def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt),
                            n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=64)
    return salt, digest.hex()


def verify_password(password: str, salt: str, expected: str) -> bool:
    _, actual = hash_password(password, salt)
    return secrets.compare_digest(actual, expected)


def create_user(email: str, name: str, password: str) -> dict[str, Any]:
    salt, digest = hash_password(password)
    now = datetime.now().isoformat()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, name, pw_salt, pw_hash, created_at, settings)"
            " VALUES (?,?,?,?,?,?)",
            (email.strip(), name.strip(), salt, digest, now,
             json.dumps({**DEFAULT_SETTINGS})),
        )
        user_id = cur.lastrowid
        # A new account starts with the notebook's wardrobe and a plausible day,
        # so nothing is empty on the first screen.
        conn.executemany(
            "INSERT INTO items (id, user_id, data) VALUES (?,?,?)",
            [(i["id"], user_id, json.dumps(i)) for i in load_seed_items()],
        )
        conn.executemany(
            "INSERT INTO slots (id, user_id, time, kind) VALUES (?,?,?,?)",
            [(s["id"], user_id, s["time"], s["kind"]) for s in DEFAULT_SCHEDULE],
        )
    return get_user(user_id)  # type: ignore[return-value]


def get_user(user_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _user_dict(row) if row else None


def get_user_by_email(email: str) -> sqlite3.Row | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM users WHERE email = ?", (email.strip(),)).fetchone()


def _user_dict(row: sqlite3.Row) -> dict[str, Any]:
    settings = {**DEFAULT_SETTINGS, **json.loads(row["settings"] or "{}")}
    settings["email"] = row["email"]
    settings["name"] = row["name"]
    return {"id": row["id"], "email": row["email"], "name": row["name"],
            "createdAt": row["created_at"], "settings": settings}


def update_user(user_id: int, *, name: str | None = None, email: str | None = None,
                settings: dict[str, Any] | None = None) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            return None
        merged = {**json.loads(row["settings"] or "{}"), **(settings or {})}
        # email and name are columns, not settings: keep one copy of each.
        merged.pop("email", None)
        merged.pop("name", None)
        conn.execute(
            "UPDATE users SET name = ?, email = ?, settings = ? WHERE id = ?",
            (name or row["name"], (email or row["email"]).strip(),
             json.dumps(merged), user_id),
        )
    return get_user(user_id)


def set_password(user_id: int, password: str) -> None:
    salt, digest = hash_password(password)
    with connect() as conn:
        conn.execute("UPDATE users SET pw_salt = ?, pw_hash = ? WHERE id = ?",
                     (salt, digest, user_id))


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------

def create_session(user_id: int) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = now + timedelta(days=SESSION_DAYS)
    with connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
            (token, user_id, now.isoformat(), expires.isoformat()),
        )
    return token, expires


def user_for_session(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None
    with connect() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE token = ?", (token,)).fetchone()
        if row is None:
            return None
        if datetime.fromisoformat(row["expires_at"]) < datetime.now():
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return None
    return get_user(row["user_id"])


def delete_session(token: str | None) -> None:
    if not token:
        return
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# --------------------------------------------------------------------------
# A person's wardrobe and day
# --------------------------------------------------------------------------

def list_items(user_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT data FROM items WHERE user_id = ?", (user_id,)).fetchall()
    return [json.loads(r["data"]) for r in rows]


def get_item(user_id: int, item_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute("SELECT data FROM items WHERE user_id = ? AND id = ?",
                           (user_id, item_id)).fetchone()
    return json.loads(row["data"]) if row else None


def put_item(user_id: int, item: dict[str, Any]) -> dict[str, Any]:
    with connect() as conn:
        conn.execute(
            "INSERT INTO items (id, user_id, data) VALUES (?,?,?)"
            " ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data",
            (item["id"], user_id, json.dumps(item)),
        )
    return item


def patch_item(user_id: int, item_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    current = get_item(user_id, item_id)
    if current is None:
        return None
    return put_item(user_id, {**current, **patch})


def delete_item(user_id: int, item_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM items WHERE user_id = ? AND id = ?", (user_id, item_id))
    return cur.rowcount > 0


def mark_worn(user_id: int, item_ids: Iterable[str], when: datetime | None = None) -> None:
    stamp = (when or datetime.now()).isoformat()
    for item_id in item_ids:
        patch_item(user_id, item_id, {"last_worn_at": stamp})


def list_slots(user_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT id, time, kind FROM slots WHERE user_id = ? ORDER BY time",
                            (user_id,)).fetchall()
    return [dict(r) for r in rows]


def add_slot(user_id: int, slot_id: str, time: str, kind: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO slots (id, user_id, time, kind) VALUES (?,?,?,?)"
            " ON CONFLICT(user_id, id) DO UPDATE SET time = excluded.time, kind = excluded.kind",
            (slot_id, user_id, time, kind),
        )


def delete_slot(user_id: int, slot_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM slots WHERE user_id = ? AND id = ?", (user_id, slot_id))
    return cur.rowcount > 0
