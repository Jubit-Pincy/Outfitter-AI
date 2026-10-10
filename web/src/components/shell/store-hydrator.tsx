"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOutfitter } from "@/lib/store";
import { PLACE_COOKIE, placeQuery } from "@/lib/weather";

const PUBLIC_ROUTES = ["/login", "/signup"];

/**
 * Reads the session once the client is up, and keeps the location mirrored
 * into a cookie. The server pages render the forecast themselves and cannot
 * see the store, so the cookie is the only way for them to know which place
 * the signed-in person picked.
 *
 * It also does the redirecting, rather than middleware: the session lives
 * behind the engine, and middleware would have to call it on every navigation
 * to learn anything middleware does not already know from this one read.
 */
export function StoreHydrator() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useOutfitter((s) => s.status);

  useEffect(() => {
    void useOutfitter.getState().load();

    const write = (settings: ReturnType<typeof useOutfitter.getState>["settings"]) => {
      const value = `${placeQuery(settings)}&units=${settings.units}`;
      document.cookie = `${PLACE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    };

    write(useOutfitter.getState().settings);
    return useOutfitter.subscribe((state, previous) => {
      if (state.settings !== previous.settings) write(state.settings);
    });
  }, []);

  useEffect(() => {
    const onPublic = PUBLIC_ROUTES.includes(pathname);
    if (status === "signed-out" && !onPublic) router.replace("/login");
    if (status === "ready" && onPublic) router.replace("/");
  }, [status, pathname, router]);

  return null;
}
