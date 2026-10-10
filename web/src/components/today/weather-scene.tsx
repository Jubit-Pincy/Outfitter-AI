"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { sceneFor, type Scene } from "@/lib/weather-codes";
import { skyClipFor } from "@/lib/sky-clip";
import { SkyVideo } from "./sky-video";
import { WeatherCanvas } from "./weather-canvas";

/**
 * The card's background: a real sky photograph for the current conditions,
 * with the weather moving over it.
 *
 * Four layers, and the top one is conditional. A gradient paints instantly and
 * shows through while the photo decodes; the photograph (public/sky, Wikimedia
 * originals, served responsively by next/image) carries the realism; then
 * either a filmed loop of the real weather (public/sky/video, chosen per
 * forecast condition in the sky lab) or — where no clip is pinned for that
 * condition — WeatherCanvas drawing rain, snow, lightning and cloud haze.
 *
 * Never both: footage of rain under drawn rain is two different downpours at
 * two different angles. Both only mount once we know the viewer welcomes
 * motion, since a paused video still downloads.
 */

/**
 * The photographs, and how to frame them. `focus` keeps the sky in view when
 * the frame is a wide, short banner — most shots have a horizon to crop past.
 * `tint` reconciles each photo with the card it sits in.
 */
const PHOTO: Record<
  Scene,
  { src: string; focus: string; tint: string } | null
> = {
  "clear-day": { src: "/sky/clear-day.jpg", focus: "50% 45%", tint: "bg-[#33456b]/10" },
  "clear-night": { src: "/sky/clear-night.jpg", focus: "50% 18%", tint: "bg-[#131a2e]/35" },
  cloudy: { src: "/sky/cloudy.jpg", focus: "50% 25%", tint: "bg-[#33456b]/15" },
  rain: { src: "/sky/rain.jpg", focus: "50% 20%", tint: "bg-[#22304d]/35" },
  storm: { src: "/sky/storm.jpg", focus: "50% 22%", tint: "bg-[#141b2c]/45" },
  // No convincing free snow sky: the rain overcast plus a cold, bright wash.
  snow: { src: "/sky/rain.jpg", focus: "50% 20%", tint: "bg-[#c9d3e4]/30" },
};

/** Painted fallback, and what shows through while a photo decodes. */
const SKY: Record<Scene, string> = {
  "clear-day": "linear-gradient(160deg, #5b7fb4 0%, #7d9cc4 45%, #c3bfa8 100%)",
  "clear-night": "linear-gradient(165deg, #1b2340 0%, #33456b 55%, #232c46 100%)",
  cloudy: "linear-gradient(160deg, #47597e 0%, #33456b 55%, #4a5470 100%)",
  rain: "linear-gradient(165deg, #2c3b5e 0%, #33456b 50%, #2a3550 100%)",
  storm: "linear-gradient(165deg, #1f2942 0%, #2b3856 55%, #1a2236 100%)",
  snow: "linear-gradient(160deg, #6b7d99 0%, #8c9bb0 50%, #c9cdd2 100%)",
};

/** True when the viewer has not asked for less motion. */
function useMotionAllowed() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAllowed(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return allowed;
}

export function WeatherScene({
  code,
  isDay,
  illumination = 100,
  windDirection,
  pop,
  /** Cover the whole viewport instead of the parent card. */
  fixed = false,
  /** Soften the footage, the way the photograph behind it is softened. */
  blurVideo = false,
  /**
   * Where the type sits on top, so the darkening goes under it. The card reads
   * from the left; the hero centres everything, and a left-weighted scrim left
   * its title on the bright part of the sky.
   */
  scrim = "left",
  priority = false,
  className,
}: {
  code: number;
  isDay: boolean;
  /** Moon lit percentage, for the night sky's crescent. */
  illumination?: number;
  windDirection?: number;
  pop?: number;
  fixed?: boolean;
  blurVideo?: boolean;
  scrim?: "left" | "center";
  /** Set on the hero, which is the page's largest contentful paint. */
  priority?: boolean;
  className?: string;
}) {
  const scene = sceneFor(code, isDay);
  const photo = PHOTO[scene];
  // The forecast's own footage, where a clip is pinned for this condition.
  const clip = skyClipFor(code, isDay);
  // The still under the loop is the loop's own first frame, so the moment the
  // video fades in nothing visibly changes. It used to be the sky photograph —
  // a different picture entirely, which read as a flash before playback.
  // Without a clip the photograph is still the backdrop.
  const still = clip
    ? { src: clip.poster, focus: "50% 50%", tint: photo?.tint ?? "" }
    : photo;
  const animate = useMotionAllowed();
  // Drawn sun and moon only back the painted fallback: the photographs have a
  // real sun of their own, and two of them in one sky read as a stray dot.
  const orbY = fixed ? "top-[15%]" : "top-1/2";

  return (
    <div
      aria-hidden
      className={cn(
        "inset-0 overflow-hidden",
        fixed ? "fixed -z-10" : "absolute",
        className
      )}
      style={{ backgroundImage: SKY[scene] }}
    >
      {still && (
        <>
          <Image
            src={still.src}
            alt=""
            fill
            // Both the card and the hero span the shell's content column:
            // 1120px capped, less its 28px gutters. Narrower than that and the
            // column is the viewport, gutters included.
            sizes="(min-width: 1120px) 1064px, 100vw"
            priority={priority}
            // Softened, the way a system widget treats its wallpaper: the sky
            // still reads as a photograph, but nothing in it competes with the
            // temperature. `scale` hides the edge the blur would otherwise
            // feather away from the corners.
            className="scale-110 object-cover blur-[7px]"
            style={{ objectPosition: still.focus }}
          />
          <div className={cn("absolute inset-0", still.tint)} />
        </>
      )}
      {!still && scene === "clear-day" && (
        <div
          className={cn(
            "wx-glow absolute right-[7%] aspect-square h-[260px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#fdf8ec_7%,rgba(251,241,216,0.42)_13%,rgba(244,227,189,0.16)_28%,transparent_55%)]",
            orbY
          )}
        />
      )}

      {!still && scene === "clear-night" && (
        <>
          <div
            className={cn(
              "absolute right-[8%] aspect-square h-[72px] -translate-y-1/2 overflow-hidden rounded-full bg-[#eef1f8] opacity-90",
              orbY
            )}
          >
            {/* A dark disc slid across the moon makes the crescent. */}
            {illumination < 92 && (
              <div
                className="absolute inset-0 rounded-full bg-[#1b2340]"
                style={{ translate: `-${illumination}% 0` }}
              />
            )}
          </div>
          <div
            className={cn(
              "absolute right-[8%] aspect-square h-[240px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(223,228,242,0.20)_16%,transparent_52%)]",
              orbY
            )}
          />
        </>
      )}

      {animate &&
        (clip ? (
          <SkyVideo clip={clip} blur={blurVideo} />
        ) : (
          <WeatherCanvas
            scene={scene}
            full={fixed}
            windDirection={windDirection}
            pop={pop}
          />
        ))}

      {/* Keeps the type legible on the pale clear-day sky. */}
      <div
        className={cn(
          "absolute inset-0",
          fixed
            ? "bg-linear-to-b from-black/35 via-black/20 to-black/45"
            : scrim === "center"
              ? // Centred text needs the middle covered, and a full moon or a
                // bright cloud there is exactly what it lands on.
                "bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.25)_100%)]"
              : "bg-linear-to-r from-black/30 via-black/10 to-transparent"
        )}
      />
    </div>
  );
}
