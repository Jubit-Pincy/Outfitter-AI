"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useOutfitter } from "@/lib/store";

/**
 * Asks the browser where we are and stores the coordinates. Only the browser
 * can answer this, so it is the one piece of the weather flow that is a
 * client action — the forecast itself is still fetched on the server, for the
 * coordinates carried in the link.
 */
export function UseMyLocation() {
  const updateSettings = useOutfitter((s) => s.updateSettings);
  const [asking, setAsking] = useState(false);

  function locate() {
    if (!navigator.geolocation) {
      toast("This browser can't share a location.");
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setAsking(false);
        updateSettings({
          location: "Current location",
          coords: {
            lat: Number(coords.latitude.toFixed(4)),
            lon: Number(coords.longitude.toFixed(4)),
          },
        });
        toast("Using your current location.");
      },
      (error) => {
        setAsking(false);
        toast(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Type a place instead."
            : "Couldn't get your location. Type a place instead."
        );
      },
      { timeout: 10_000, maximumAge: 600_000 }
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={locate} disabled={asking}>
      <LocateFixed className="size-3.5" strokeWidth={1.8} />
      {asking ? "Locating…" : "Use my location"}
    </Button>
  );
}
