"""A run through every route, against a throwaway database.

    python selftest.py

Nothing here touches the notebook's items.json, and the database it builds is
deleted at the end. It is the quickest way to tell whether the engine still
produces outfits after a change.
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

from outfitter import config

# Point the store at a scratch database before anything imports it.
config.DB_FILE = config.DATA_DIR / "selftest.db"
config.DB_FILE.unlink(missing_ok=True)

import main  # noqa: E402
from outfitter import store  # noqa: E402

store.DB_FILE = config.DB_FILE
store.init_db()

client = TestClient(main.app)
failures: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"{'PASS' if ok else 'FAIL'}  {label}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(label)


# The wardrobe photographs are deliberately not in the repository - they are
# somebody's actual clothes - so a fresh clone has none and the seed loader
# correctly returns nothing. The engine still has to be testable there, so the
# test builds its own wardrobe when the real one is absent.
seeded = store.load_seed_items()
HAVE_PHOTOS = len(seeded) > 0
if HAVE_PHOTOS:
    check("starter wardrobe loads", len(seeded) > 100, f"{len(seeded)} items with photos")
else:
    print("NOTE  no wardrobe photos on this machine; testing against a built-in set")


def build_test_wardrobe() -> None:
    """A small wardrobe that covers every category and both ends of each ladder."""
    pieces = []
    for cat, shape in [("Tops", "tee"), ("Bottoms", "jeans"), ("Dresses", "dress"),
                       ("Outerwear", "jacket"), ("Shoes", "sneaker")]:
        for formality in ("Casual", "Athletic", "Smart casual", "Formal"):
            for warmth, colour in (("Light", "White"), ("Medium", "Navy"), ("Heavy", "Black")):
                pieces.append({"name": f"{colour} {formality} {cat}", "cat": cat,
                               "shape": shape, "colorName": colour, "warmth": warmth,
                               "formality": formality})
    for piece in pieces:
        client.post("/items", json=piece)

r = client.post("/auth/signup", json={"name": "Test Person",
                                      "email": "test@example.com",
                                      "password": "a-good-password"})
check("signup", r.status_code == 200, str(r.status_code))
user = r.json()["user"]
check("signup seeds the wardrobe", len(client.get("/items").json()["items"]) == len(seeded),
      f"{len(seeded)} pieces copied")
check("settings carry the account email", user["settings"]["email"] == "test@example.com")

check("duplicate signup refused",
      client.post("/auth/signup", json={"name": "Again", "email": "test@example.com",
                                        "password": "another-password"}).status_code == 409)

client.post("/auth/logout")
check("logged out means 401", client.get("/items").status_code == 401)
check("wrong password refused",
      client.post("/auth/login", json={"email": "test@example.com",
                                       "password": "wrong-password"}).status_code == 401)
check("login", client.post("/auth/login", json={"email": "test@example.com",
                                                "password": "a-good-password"}).status_code == 200)

if not HAVE_PHOTOS:
    build_test_wardrobe()

items = client.get("/items").json()["items"]
check("the wardrobe has something in it", len(items) > 0, f"{len(items)} pieces")
first = items[0]
check("items are in the web's vocabulary",
      first["cat"] in {"Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories"},
      first["cat"])
if HAVE_PHOTOS:
    check("items carry a photo url", str(first["photo"]).startswith("/api/media/"),
          str(first["photo"]))
    check("photo is served", client.get(str(first["photo"]).replace("/api", "")).status_code == 200)

r = client.patch(f"/items/{first['id']}", json={"name": "Renamed piece", "warmth": "Heavy"})
check("edit an item", r.status_code == 200 and r.json()["item"]["name"] == "Renamed piece")
check("edit round-trips through the engine",
      store.get_item(user["id"], first["id"])["warmth"] == "heavy")

r = client.post("/items", json={"name": "Hand-added tee", "cat": "Tops", "colorName": "Sage",
                                "warmth": "Light", "formality": "Casual"})
check("add an item", r.status_code == 200)
added = r.json()["item"]["id"]
check("delete an item", client.delete(f"/items/{added}").status_code == 200)

# Picks, over a day that exercises every occasion and both ends of the weather.
day = [
    {"id": "s1", "kind": "Office", "time": "09:30", "temp": 19, "rainProbability": 10},
    {"id": "s2", "kind": "Gym", "time": "18:30", "temp": 24, "rainProbability": 0},
    {"id": "s3", "kind": "Dinner out", "time": "20:30", "temp": 14, "rainProbability": 70},
    {"id": "s4", "kind": "Casual", "time": "12:00", "temp": 8, "rainProbability": 20},
]
r = client.post("/picks", json={"occasions": day, "perOccasion": 2, "restDays": 5})
check("picks respond", r.status_code == 200, str(r.status_code))
picks = r.json()["picks"]
for p in picks:
    outfits = p["outfits"]
    ok = len(outfits) == 2
    check(f"  {p['kind']} gets two outfits", ok,
          f"{p['considered']} eligible, {p['combosBuilt']} combos")
    for outfit in outfits:
        cats = [i["cat"] for i in outfit["items"]]
        check(f"  {p['kind']}: no dress worn with trousers",
              not ("Dresses" in cats and "Bottoms" in cats), " + ".join(cats))
        if HAVE_PHOTOS:
            check(f"  {p['kind']}: every piece has a photo",
                  all(i["photo"] for i in outfit["items"]))
    if len(outfits) == 2:
        a, b = (set(o["ids"]) for o in outfits)
        check(f"  {p['kind']}: the two differ", a != b)
        # A different shoe on the same top and trousers is the same outfit.
        cores = [
            {i["id"] for i in o["items"] if i["cat"] in ("Tops", "Bottoms", "Dresses")}
            for o in outfits
        ]
        check(f"  {p['kind']}: the runner-up is not a shoe swap",
              not (cores[0] & cores[1]),
              " / ".join(str(len(c)) for c in cores))

# Wearing an outfit should push it down the ranking next time.
worn = picks[0]["outfits"][0]["ids"]
client.post("/items/worn", json={"ids": worn})
again = client.post("/picks", json={"occasions": day[:1], "perOccasion": 2, "restDays": 5}).json()
check("a worn outfit is not suggested again",
      set(again["picks"][0]["outfits"][0]["ids"]) != set(worn))

r = client.patch("/auth/me", json={"name": "Renamed Person",
                                   "settings": {"location": "Mumbai", "restDays": 9}})
check("profile updates", r.status_code == 200 and r.json()["user"]["name"] == "Renamed Person")
check("settings persist", client.get("/auth/me").json()["user"]["settings"]["location"] == "Mumbai")
check("email stays in settings", client.get("/auth/me").json()["user"]["settings"]["email"]
      == "test@example.com")

r = client.post("/schedule", json={"time": "07:00", "kind": "Gym"})
check("add a slot", r.status_code == 200 and len(r.json()["schedule"]) == 3)
check("duplicate slot refused",
      client.post("/schedule", json={"time": "07:00", "kind": "Gym"}).status_code == 409)

check("password change needs the old one",
      client.post("/auth/password", json={"currentPassword": "nope",
                                          "newPassword": "brand-new-password"}).status_code == 401)
check("password changes",
      client.post("/auth/password", json={"currentPassword": "a-good-password",
                                          "newPassword": "brand-new-password"}).status_code == 200)

check("media path cannot escape the folder",
      client.get("/media/..%2F..%2Fitems.json").status_code in (404, 400))

client.close()
try:
    config.DB_FILE.unlink(missing_ok=True)
except PermissionError:
    # Windows keeps the handle until the connection pool is collected; the
    # next run truncates the file anyway.
    pass
print()
if failures:
    print(f"{len(failures)} failed: " + ", ".join(failures))
    sys.exit(1)
print("All checks passed.")
