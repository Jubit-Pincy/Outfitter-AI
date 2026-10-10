"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "cn";
import { useOutfitter } from "@/lib/store";

interface Hit {
  id: number;
  label: string;
  lat: number;
  lon: number;
}

/**
 * Autocomplete over Open-Meteo's geocoder. This one fetch does run in the
 * browser — it answers keystrokes, not the page — and picking a result stores
 * the coordinates, so the forecast never has to guess at the name again.
 */
export function CitySearch({
  /**
   * `field` — Settings' right-aligned row. `header` — the same editable field,
   * left-aligned beside the pin in the chrome. `search` — a search box.
   */
  variant = "field",
  /**
   * Navigate to the chosen city's forecast on pick. Separate from `variant`
   * because the header now wears the field's clothes on a page that is still
   * server-rendered per city — without this the label would change and the
   * forecast under it would not.
   */
  navigate,
}: {
  variant?: "field" | "search" | "header";
  navigate?: boolean;
} = {}) {
  const settings = useOutfitter((s) => s.settings);
  const updateSettings = useOutfitter((s) => s.updateSettings);
  const router = useRouter();

  const [query, setQuery] = useState<string | null>(null);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  // In Settings the field shows the saved location when idle; the header
  // search starts empty, like any search box.
  const search = variant === "search";
  const value = query ?? (search ? "" : settings.location);

  useEffect(() => {
    const term = query?.trim() ?? "";
    // Debounced so a fast typist makes one request, not eight.
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        return;
      }
      try {
        const res = await fetch(
          "https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" +
            encodeURIComponent(term),
          { signal: controller.signal }
        );
        const data = await res.json();
        setHits(
          (data.results ?? []).map(
            (r: {
              id: number;
              name: string;
              admin1?: string;
              country?: string;
              latitude: number;
              longitude: number;
            }) => ({
              id: r.id,
              label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
              lat: r.latitude,
              lon: r.longitude,
            })
          )
        );
        setActive((i) => (i === 0 ? 0 : i));
      } catch {
        // An aborted or failed lookup just means no suggestions.
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Clicking away closes the list.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(hit: Hit) {
    const coords = {
      lat: Number(hit.lat.toFixed(4)),
      lon: Number(hit.lon.toFixed(4)),
    };
    updateSettings({ location: hit.label, coords });
    setQuery(null);
    setHits([]);
    setOpen(false);
    if (navigate ?? variant === "search") {
      // The forecast is fetched on the server, so picking a city is a
      // navigation rather than a client-side refetch.
      router.push(
        `/weather?lat=${coords.lat}&lon=${coords.lon}&units=${settings.units}`
      );
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQuery(null);
      setOpen(false);
      return;
    }
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      choose(hits[active]);
    }
  }

  const showList = open && hits.length > 0;

  return (
    <div
      ref={box}
      className={cn(
        "relative",
        search ? "w-[190px]" : variant === "header" ? "w-[130px]" : "max-w-full"
      )}
    >
      {search && (
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-soft"
          strokeWidth={1.8}
          aria-hidden
        />
      )}
      <input
        value={value}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Snap back to the saved place: the field used to keep showing a
          // half-typed city that had never been committed anywhere.
          window.setTimeout(() => {
            setQuery(null);
            setOpen(false);
          }, 120);
        }}
        onKeyDown={onKeyDown}
        placeholder={search ? "Search" : "Search a city"}
        aria-label="Location"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={cn(
          "bg-transparent text-[14.5px] transition-colors outline-none",
          search &&
            "w-full rounded-lg border border-stitch bg-linen py-1.5 pr-3 pl-8 text-ink placeholder:text-ink-soft focus:border-ink",
          !search &&
            "max-w-full border-b border-transparent py-2 font-medium text-ink hover:border-b-ink focus:border-b-ink",
          // Settings sets its rows right-aligned; the chrome reads left to
          // right from the pin.
          variant === "field" && "w-40 text-right",
          variant === "header" && "w-full text-[13.5px]"
        )}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching cities"
          className={cn(
            "absolute top-full right-0 z-40 mt-2 w-[260px] overflow-hidden rounded-xl border py-1 shadow-lg",
            search
              ? "border-stitch bg-paper text-ink"
              : "border-stitch bg-paper"
          )}
        >
          {hits.map((hit, i) => (
            <li key={hit.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(hit)}
                className={cn(
                  "block w-full px-3 py-2 text-left text-[13.5px]",
                  search
                    ? i === active
                      ? "bg-linen"
                      : ""
                    : i === active
                      ? "bg-linen text-ink"
                      : "text-ink"
                )}
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
