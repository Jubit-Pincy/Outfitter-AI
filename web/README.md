# Outfitter AI — the web app

The front end. It no longer decides anything on its own: the wardrobe, the
accounts and the choosing all live in the Python engine in [`../../api/`](../api/),
which this app calls.

**Start here instead: [the root README](../README.md).** It covers both halves
and how to run them together.

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # tsc --noEmit && eslint src - run this before committing
npm run build
```

The engine has to be running on :8000 or every screen will say so.

## Stack

Next.js 16 (App Router, TypeScript, Turbopack) · React 19 · Tailwind CSS v4 ·
shadcn/ui (Radix base) · Motion for React · Zustand · Sonner · lucide-react ·
fonts via `next/font/google`.

## Screens

Sign in, sign up, Today, Weather, Wardrobe, Schedule and Settings, plus item
editing and an add-item flow.

## Where the data comes from

| | |
|---|---|
| [`lib/api.ts`](web/src/lib/api.ts) | Every call to the engine |
| [`app/api/[...path]/route.ts`](web/src/app/api/%5B...path%5D/route.ts) | Forwards them to :8000, so the session cookie stays same-origin |
| [`lib/store.ts`](web/src/lib/store.ts) | A cache of what the engine holds, not a source of truth |
| [`hooks/use-picks.ts`](web/src/hooks/use-picks.ts) | Sends the day and the weather, holds the outfits |

The store used to seed itself from `data/` and persist to `localStorage`,
which is why editing a seed file appeared to work for one frame and was then
overwritten. It now hydrates from the signed-in account and writes through:
every change moves local state at once so the tap feels instant, sends it, and
rolls back if the engine refuses. Nothing is written to `localStorage`, so
there is no stale copy to clear.

The weather is still fetched here — Open-Meteo, on the server, keyless — and
sent to the engine with the request for picks, so the reason under an outfit
matches the sky above it.

## The other folders

`reference/` holds the original HTML prototype, untouched, as the visual
reference for every screen.

`AGENTS.md` (and `CLAUDE.md`, which includes it) carry the notes for coding
agents - chiefly that this is Next.js 16 and the docs in
`node_modules/next/dist/docs/` are the authority over older habits.
