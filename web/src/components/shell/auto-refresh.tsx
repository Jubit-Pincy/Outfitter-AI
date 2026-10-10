"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the server render of the page it sits on, so a tab left open stops
 * showing the temperature it was opened with.
 *
 * The forecast is fetched on the server and handed down as props, and nothing
 * on the client ever asked for it again — a page open since morning still read
 * 26° at midnight, with yesterday's date above it.
 *
 * `router.refresh()` re-renders the Server Components and merges the result in,
 * keeping client state and scroll position. It does not clear the server's
 * fetch cache, so a refresh inside the data layer's 15-minute window costs
 * nothing upstream; past it, the next refresh picks up new numbers.
 */
export function AutoRefresh({ everyMs = 300_000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    // A hidden tab is nobody's live view; refreshing it is wasted work, and
    // background timers are throttled anyway.
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const timer = setInterval(refresh, everyMs);
    // Coming back to a tab is the moment the staleness is most visible.
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, everyMs]);

  return null;
}
