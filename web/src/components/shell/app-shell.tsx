"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "cn";
import { CitySearch } from "@/components/settings/city-search";
import { useOutfitter } from "@/lib/store";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/schedule", label: "Schedule" },
] as const;

const PUBLIC_ROUTES = ["/login", "/signup"];

/** The first letter of the account's name, for the avatar. */
const initial = (name: string, email: string) =>
  (name.trim()[0] ?? email.trim()[0] ?? "?").toUpperCase();

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const status = useOutfitter((s) => s.status);
  const settings = useOutfitter((s) => s.settings);

  // Sign-in and sign-up get the page to themselves: no nav to a wardrobe you
  // cannot see yet, and no city picker for a forecast nobody asked for.
  if (PUBLIC_ROUTES.includes(pathname)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <p className="mb-5 text-center">
            <span className="inline-block rounded-[3px] bg-ink/90 px-3 py-1.5 text-[11.5px] font-bold tracking-[0.15em] text-paper">
              OUTFITTER AI
            </span>
          </p>
          {children}
        </div>
      </main>
    );
  }

  // Held back rather than flashed: without this the whole app renders empty
  // for a beat and then fills in, which reads as a bug the first time.
  if (status !== "ready") {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <p className="flex items-center gap-2.5 text-[14.5px] text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {status === "loading" ? "Opening your wardrobe" : "Taking you to sign in"}
        </p>
      </main>
    );
  }

  // The sky lives inside /weather's hero panel, so the chrome stays linen
  // everywhere; the route only decides whether picking a city navigates.
  const onWeather = pathname.startsWith("/weather");

  return (
    <>
      <header className={cn("sticky top-0 z-30 border-b border-linen-2 bg-paper")}>
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:gap-8 sm:px-7 sm:py-0">
          <Link
            href="/"
            className="relative shrink-0 rounded-[3px] bg-ink/90 px-2.5 py-1.5 text-[10.5px] font-bold tracking-[0.12em] text-paper whitespace-nowrap sm:px-3 sm:text-[11.5px] sm:tracking-[0.15em] sm:before:absolute sm:before:top-1/2 sm:before:-left-2.5 sm:before:h-px sm:before:w-2.5 sm:before:bg-stitch sm:after:absolute sm:after:top-1/2 sm:after:-right-2.5 sm:after:h-px sm:after:w-2.5 sm:after:bg-stitch"
          >
            OUTFITTER AI
          </Link>
          <nav className="order-3 flex w-full gap-1 sm:order-none sm:ml-1 sm:w-auto">
            {NAV.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13.5px] whitespace-nowrap transition-colors sm:px-3.5 sm:py-2 sm:text-[14.5px]",
                    active
                      ? "bg-linen font-semibold text-ink"
                      : "text-ink-soft hover:bg-linen",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            {/* One control, not two: the location is the search. Typing in it
                offers cities, and picking one sets the forecast — the same
                field Settings shows, rather than a search box beside a label
                that only looked editable. */}
            <div className="flex min-w-0 items-center gap-1.5 text-ink-soft">
              <MapPin className="size-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
              {/* On the forecast page the pick has to navigate: that page is
                  server-rendered per city. */}
              <CitySearch variant="header" navigate={onWeather} />
            </div>
            <Link
              href="/settings"
              title={settings.email || "Settings"}
              aria-label={`Settings for ${settings.name || settings.email}`}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-fern text-[13px] font-semibold text-white"
            >
              {initial(settings.name, settings.email)}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] px-5 pt-7 pb-20 sm:px-7 sm:pt-8">
        {children}
      </main>
    </>
  );
}
