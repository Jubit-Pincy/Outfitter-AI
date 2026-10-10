"use client";

import { useState } from "react";
import { cn } from "cn";
import type { SkyClipSource } from "@/lib/sky-clip";

/**
 * The moving sky: a short, silent, self-hosted loop of the real weather.
 *
 * It sits over the photograph rather than replacing it, so the still holds the
 * frame while the loop buffers and keeps it if the loop cannot play at all.
 * `prefers-reduced-motion` is handled by the caller, which does not render
 * this at all — a paused video still downloads.
 *
 * Plain `loop` is enough because the clips in public/sky/video are palindromes:
 * eight seconds forward and the same eight reversed, so the last frame is the
 * first and the cloud never snaps back to where it started. The stock footage
 * they were cut from does not loop on its own — its end frame differs from its
 * start by about as much as its midpoint does — and crossfading two copies here
 * only turned that jump into a soft rewind. The fix belongs in the file.
 */
export function SkyVideo({
  clip,
  blur = false,
}: {
  clip: SkyClipSource;
  /** Soften the footage to match the still it plays over. */
  blur?: boolean;
}) {
  /** Held by src rather than a flag, so a changed clip is unready for free. */
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <video
      key={clip.src}
      src={clip.src}
      poster={clip.poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden
      // React sets `muted` as a property and never writes the attribute, so
      // the autoplay policy sees a video with sound and refuses to start it.
      // Muting the element itself is what actually satisfies the policy.
      ref={(element) => {
        if (!element) return;
        element.muted = true;
        void element.play().catch(() => {});
      }}
      onCanPlay={() => setReadyFor(clip.src)}
      onError={() => setFailed(true)}
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-700",
        // Exactly the still beneath it — same blur, same scale — so the fade
        // from poster frame to moving footage changes nothing but the motion.
        // (16px was tried and turned a drizzle clip into a brown smear.)
        // `scale` hides the transparent edge the blur would otherwise feather
        // in from the corners, the same trick the photograph underneath uses.
        blur ? "scale-110 blur-[7px]" : "scale-105",
        readyFor === clip.src ? "opacity-100" : "opacity-0"
      )}
    />
  );
}
