"use client";

import { useEffect, useRef, useState } from "react";
import { useOutfitter } from "@/lib/store";

/**
 * Toasts are painted, not announced. This mirrors the handful of changes that
 * matter into a polite live region so a screen reader hears them too.
 */
export function LiveRegion() {
  const items = useOutfitter((s) => s.items.length);
  const slots = useOutfitter((s) => s.schedule.length);
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setMessage(`${items} pieces in the wardrobe, ${slots} slots on today.`);
  }, [items, slots]);

  return (
    <p aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}
