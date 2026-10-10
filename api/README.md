# The Outfitter AI engine

`OutfitterAI_with_florence.ipynb`, lifted out of the notebook and put behind
HTTP so the web app can use it. The maths is the notebook's; the modules say
where each piece came from and flag the few places behaviour had to change.

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
python selftest.py          # every route, against a throwaway database
```

Nothing here writes to the notebook or its folder. `Images/items.json` is read
once, as the starter wardrobe each new account is given a copy of, so the
notebook keeps running exactly as it did.

## What lives where

| File | Notebook cells | What it is |
|---|---|---|
| [`outfitter/rules.py`](outfitter/rules.py) | 12, 24-26 | The warmth and formality ladders, and the occasion filter |
| [`outfitter/scoring.py`](outfitter/scoring.py) | 27, 32-38 | Colour wheel, temperature fit, layering, recency, the weights, the choice |
| [`outfitter/tagging.py`](outfitter/tagging.py) | 7-13 | Florence-2 and the Lab-space colour reader |
| [`outfitter/weather.py`](outfitter/weather.py) | 21-23 | ip-api and OpenWeatherMap |
| [`outfitter/store.py`](outfitter/store.py) | 3-5 | Accounts, wardrobes and schedules, in SQLite |
| [`outfitter/webschema.py`](outfitter/webschema.py) | — | `top` ↔ `Tops`, in both directions |

## Where it differs from the notebook

Four changes, all forced by running against the real 120-item wardrobe:

1. **An outfit is a top and a bottom, *or* a dress.** The notebook's
   `product(tops, bottoms, dresses, outerwear, shoes)` put you in all of them
   at once, and returned nothing at all when any one list was empty.
2. **The formality filter allows one step either way.** Matching exactly left
   `gym` with no tops and `office` with no bottoms, so both screens were blank.
   The scorer still puts the exact match first. A person's own answer in
   Settings — "Gym counts as …" — overrides the default.
3. **The runner-up must be a different outfit.** The notebook penalised an
   overlapping combo *after* adding it, so the second suggestion was reliably
   the first one with another shoe on. Repeating outerwear or shoes now only
   costs score; repeating the top, bottom or dress disqualifies.
4. **`score_combo` survives a dress.** It read `combo["top"]["color_primary"]`
   unconditionally, which had no top to read.

Two crashes were also fixed on the way: `recency_penalty` on a `NaN` date (the
notebook patched this in cell 39 by redefining the function), and the mixed
`\` and `/` separators in `items.json`'s image paths.

## Speed

Tagging a photo loads Florence-2 and u2net on the first call — about a minute,
once per process. After that a photo takes around a second on a laptop GPU.

The one speed change worth knowing about: `rembg.remove(image)` builds a new
session per call and reloads u2net from disk each time, which cost 39 seconds
a photo against Florence-2's 4. `outfitter/tagging.py` holds the session.

Picks are cheap — no model, just the scoring — but the cross product is not
free: 21 tops × 18 bottoms × 16 outerwear × 14 shoes is 84,672 outfits for one
occasion. Each category is ranked on its own fit and trimmed to its best ten
first, which reaches the same winners out of a few thousand.

## Routes

| | |
|---|---|
| `POST /auth/signup` `/auth/login` `/auth/logout` | Sets or clears the session cookie |
| `GET` `PATCH /auth/me`, `POST /auth/password` | The account and its settings |
| `GET` `POST /items`, `PATCH` `DELETE /items/{id}` | The wardrobe |
| `POST /items/worn` | Records a wear, which starts the rest period |
| `POST /tagging`, `GET /tagging/status` | Florence-2 on an uploaded photo |
| `GET /media/{file}` | A wardrobe photo |
| `GET` `POST /schedule`, `DELETE /schedule/{id}` | The day |
| `POST /picks` | The whole pipeline, per occasion |
| `GET /health` | Whether the wardrobe loaded and what tagging is available |

`/picks` takes the weather with the request rather than fetching its own. The
web app has already fetched a forecast and painted the sky from it, and an
outfit's stated reason should match the sky above it.

## Configuration

Read from `notebook/.env`, then `api/.env`:

- `OPENWEATHER_API_KEY` — only for `outfitter/weather.py`, which is the
  fallback for callers that bring no weather of their own. The web app never
  needs it.
- `FLORENCE_MODEL` — defaults to `microsoft/Florence-2-base`.

## Accounts

Passwords are hashed with `hashlib.scrypt` — a real KDF from the standard
library, no wheel to install — and sessions are random tokens in the same
SQLite file, expiring after 30 days.

This is a local development service. It is served over plain HTTP on
localhost, so the session cookie is not `Secure`; putting it on a network
would need TLS, and `data/outfitter.db` holds real password hashes, so it is
git-ignored.
