# Outfitter AI

An AI wardrobe assistant. Photograph your clothes and it reads them — what the
garment is, what colour, how warm, how dressy — then tells you what to wear to
each thing on your day, against the real weather at the hour you'll be out.

Two outfits per occasion, with the reasoning shown: the temperature it scored
against, the rain it expected, how many pieces were eligible and how many
combinations it weighed.

---

## How it works

```
   photo ──▶ Florence-2 ──▶ tags ─┐
                                  ├──▶ scoring ──▶ two outfits per occasion
   forecast ──▶ Open-Meteo ───────┘
```

A garment is tagged once, when you add it. The photograph goes to
[Florence-2](https://huggingface.co/microsoft/Florence-2-base), which names the
garment, while the dominant colour is measured off the cloth itself — the
background is cut away with [rembg](https://github.com/danielgatis/rembg), then
k-means in CIELAB space finds the colour and matches it to the nearest name, so
"nearest" means what the eye means rather than what RGB arithmetic says.

Choosing an outfit is a weighted score over every workable combination:

| | weight | what it measures |
|---|---|---|
| temperature | 1.5 | insulation against the forecast for that hour |
| occasion | 1.2 | how well the pieces suit a gym / office / dinner / casual slot |
| colour | 1.0 | whether the two main pieces go together, on a 12-point wheel |
| recency | −1.0 | how recently each piece was worn, easing off over a rest period |
| layering | 0.8 | whether what's under the coat makes sense with it |

The best two per occasion are kept, and the runner-up has to differ in its top,
bottom or dress — not just its shoes.

## Running it

You need **Node 20+** and **Python 3.11+**. Nothing else to configure: no API
keys, no database to create. The weather comes from Open-Meteo, which is
keyless.

Two terminals:

```bash
cd api
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

```bash
cd web
npm install
npm run dev
```

Then open **http://localhost:3000** and make an account.

Start the engine first. If the app comes up before it, every screen says the
engine is not answering until it is ready.

**Your wardrobe starts empty.** The photographs this was built from are
somebody's actual clothes, so they aren't in the repository — only their tags,
in `notebook/Images/items.json`. Add your own through **Add item**: drop in a
photo and the tagger fills the form for you to correct. Two or three pieces per
category is enough for the picks to start working.

Auto-tagging needs the heavier dependencies — torch, transformers, rembg,
scikit-learn, listed in `notebook/requirements.txt`. Without them everything
else still works and you tag by hand; `GET /health` reports what's available.
The first photo of a session takes about a minute while the models load, and
roughly a second after that.

## What's in here

| | |
|---|---|
| [`notebook/`](notebook/) | The original Jupyter notebook the project began as |
| [`api/`](api/) | That notebook as a FastAPI service, plus accounts — see [its README](api/README.md) |
| [`web/`](web/) | The app: Next.js 16, React 19, Tailwind v4 — see [its README](web/README.md) |

The engine is a port, not a rewrite: every module in `api/outfitter/` names the
notebook cells it came from, and the weights and colour wheel above are the
notebook's own. Four things did have to change to survive a real 120-item
wardrobe — including outfits that put you in a top, trousers *and* a dress at
once, and a runner-up that was reliably the winner wearing a different shoe.
[The API README](api/README.md) sets out all four and why.

The browser only ever talks to the Next.js app; everything under `/api` is
forwarded to the Python service, which keeps the session cookie `httpOnly` and
same-origin and means no API address is baked into the client bundle.

Accounts are email and password, hashed with scrypt into a local SQLite file.
This is a development setup served over plain HTTP on localhost — putting it on
a network would need TLS first.

## Tests

```bash
cd api && python selftest.py
```

Runs every route against a throwaway database: sign-up and sign-in, the
wardrobe, outfits for four occasions in different weather, and the rules that
are easy to break — no dress worn with trousers, no shoe-swap runner-up, no
path escaping the photo folder. It builds its own wardrobe when the
photographs aren't present, so it works on a fresh clone.

```bash
cd web && npm run check   # tsc --noEmit && eslint src
```

## Credits

Weather, 15-minute precipitation nowcast, air quality and 30-year normals from
[Open-Meteo](https://open-meteo.com); geocoding from Open-Meteo and
[Nominatim](https://nominatim.org). Sky video from
[Pixabay](https://pixabay.com), stills from Wikimedia Commons — three are
CC BY-SA and credited on screen. Tagging by Microsoft's Florence-2.
