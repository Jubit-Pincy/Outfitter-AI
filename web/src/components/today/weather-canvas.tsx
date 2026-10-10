"use client";

import { useEffect, useRef } from "react";
import type { Scene } from "@/lib/weather-codes";

/**
 * The moving half of the weather scene: a canvas particle field drawn over the
 * painted sky in weather-scene.tsx.
 *
 * Canvas rather than video (no assets to ship, and the motion follows the real
 * wind and rain figures) and rather than WebGL (no support check, no CDN, far
 * less battery for a strip of background). It mounts only when motion is
 * welcome, so `prefers-reduced-motion` and the pre-hydration render both fall
 * back to the static sky underneath.
 */

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  sway: number;
  phase: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  rate: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The cloud bank, composited once into a strip wider than the canvas. Each
 * frame then costs two `drawImage` calls of that strip instead of a dozen
 * large alpha fills, which is the difference between 60fps and 15.
 */
function cloudStrip(
  width: number,
  height: number,
  wet: boolean,
  /** 0 = distant haze, 1 = near, heavier cloud. */
  depth: number
) {
  const strip = document.createElement("canvas");
  strip.width = Math.max(Math.round(width * 1.5), 2);
  strip.height = Math.max(Math.round(height), 2);
  const c = strip.getContext("2d");
  if (!c) return strip;

  const puffs = Math.round(rand(14, 20) * Math.max(width / 700, 0.8));
  for (let i = 0; i < puffs; i++) {
    const r = rand(0.18, 0.46) * height * (0.9 + depth * 1.2);
    const x = rand(0, strip.width);
    const y = rand(-height * 0.2, height * (depth > 0.5 ? 0.55 : 0.9));
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    // Rain keeps its sky dark; a dry overcast wants visible cloud mass.
    const alpha = rand(0.07, 0.17) * (0.7 + depth * 0.6) * (wet ? 0.45 : 1);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.42})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return strip;
}

export function WeatherCanvas({
  scene,
  /** Covering the viewport rather than a card. */
  full = false,
  /** Degrees the wind is coming from, for the angle of the rain. */
  windDirection = 250,
  /** Chance of precipitation, which sets how heavy the rain looks. */
  pop = 50,
}: {
  scene: Scene;
  full?: boolean;
  windDirection?: number;
  pop?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let banks: { strip: HTMLCanvasElement; x: number; speed: number }[] = [];
    let drops: Drop[] = [];
    let stars: Star[] = [];

    const wet = scene === "rain" || scene === "storm";
    const snowing = scene === "snow";
    const clouded = scene !== "clear-day" && scene !== "clear-night";

    // `windDirection` is where the wind blows *from*, so a westerly (270°)
    // pushes rain east. The streak's lower end must lead in that direction —
    // it used to lean the opposite way to the drift the same value applied.
    const tilt = -Math.sin(((windDirection - 180) * Math.PI) / 180) * 0.34;

    /** Particle counts scale with area so the card and the hero look alike. */
    function seed() {
      const area = (width * height) / 60_000;

      banks = clouded
        ? [
            { strip: cloudStrip(width, height, wet, 0.15), x: 0, speed: 5 },
            { strip: cloudStrip(width, height, wet, 0.85), x: 0, speed: 13 },
          ]
        : [];

      const fall = wet
        ? Math.round((70 + pop * 1.6) * Math.max(area, 0.55))
        : snowing
          ? Math.round(46 * Math.max(area, 0.55))
          : 0;

      drops = Array.from({ length: fall }, () => {
        const depth = Math.random();
        return {
          x: rand(-0.15 * width, width * 1.15),
          y: rand(-height, height),
          // Streak length is capped so a tall viewport does not draw sabres.
          len: snowing
            ? rand(1.4, 3.4)
            : Math.min(rand(0.07, 0.16) * height, 34) * (0.6 + depth),
          speed: snowing ? rand(24, 58) : rand(700, 1250) * (0.55 + depth),
          alpha: snowing ? rand(0.45, 0.9) : rand(0.14, 0.4) * (0.5 + depth),
          sway: snowing ? rand(8, 26) : 0,
          phase: rand(0, Math.PI * 2),
        };
      });

      stars =
        scene === "clear-night"
          ? Array.from({ length: Math.round(46 * Math.max(area, 0.6)) }, () => ({
              x: rand(0, width),
              y: rand(0, height * 0.92),
              r: rand(0.4, 1.5),
              phase: rand(0, Math.PI * 2),
              rate: rand(0.6, 2.4),
            }))
          : [];
    }

    // A blurry backdrop gains nothing from retina pixels, and fill cost grows
    // with the square of this. A full-page sky gets less than a card.
    const dpr = Math.min(window.devicePixelRatio || 1, full ? 0.8 : 1.25);
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    resize();
    // Rebuilding the cloud strips costs two offscreen canvases and dozens of
    // gradient fills, so don't do it on every frame of a window drag.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    observer.observe(canvas);

    // Lightning: a bolt every few seconds, with a two-stage flash.
    let boltAt = scene === "storm" ? rand(1, 4) : Infinity;
    let bolt: { path: [number, number][]; life: number } | null = null;

    function strike() {
      const path: [number, number][] = [];
      let x = rand(width * 0.15, width * 0.85);
      let y = 0;
      while (y < height * 0.8) {
        path.push([x, y]);
        y += rand(height * 0.1, height * 0.22);
        x += rand(-width * 0.06, width * 0.06);
      }
      bolt = { path, life: 0.26 };
    }

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let running = true;

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      ctx!.clearRect(0, 0, width, height);

      // Clouds: pre-composited strips, scrolling at their own speeds.
      for (const bank of banks) {
        bank.x = (bank.x + bank.speed * dt) % bank.strip.width;
        ctx!.drawImage(bank.strip, -bank.x, 0);
        ctx!.drawImage(bank.strip, bank.strip.width - bank.x, 0);
      }

      if (stars.length) {
        for (const s of stars) {
          const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(elapsed * s.rate + s.phase));
          ctx!.fillStyle = `rgba(238,241,248,${twinkle})`;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      if (snowing) {
        ctx!.fillStyle = "#ffffff";
        for (const d of drops) {
          d.y += d.speed * dt;
          d.x += Math.sin(elapsed * 0.8 + d.phase) * d.sway * dt;
          if (d.y > height + 4) {
            d.y = -4;
            d.x = rand(0, width);
          }
          ctx!.globalAlpha = d.alpha;
          ctx!.beginPath();
          ctx!.arc(d.x, d.y, d.len, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      } else if (wet) {
        ctx!.strokeStyle = "#dfe6f4";
        ctx!.lineCap = "round";
        for (const d of drops) {
          d.y += d.speed * dt;
          d.x += d.speed * tilt * dt;
          if (d.y > height + d.len) {
            d.y = -d.len;
            d.x = rand(-0.15 * width, width * 1.15);
          }
          ctx!.globalAlpha = d.alpha;
          ctx!.lineWidth = d.len > height * 0.14 ? 1.3 : 0.8;
          ctx!.beginPath();
          ctx!.moveTo(d.x, d.y);
          ctx!.lineTo(d.x - d.len * tilt, d.y + d.len);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      if (scene === "storm") {
        boltAt -= dt;
        if (boltAt <= 0) {
          strike();
          boltAt = rand(3.5, 9);
        }
        if (bolt) {
          bolt.life -= dt;
          if (bolt.life <= 0) {
            bolt = null;
          } else {
            // Flickers rather than fading smoothly, the way lightning reads.
            const on = bolt.life > 0.2 || (bolt.life > 0.1 && bolt.life < 0.15);
            if (on) {
              ctx!.fillStyle = "rgba(232,222,196,0.16)";
              ctx!.fillRect(0, 0, width, height);
              // Drawn twice: a wide soft pass for the glow, a bright core on top.
              ctx!.lineJoin = "round";
              ctx!.beginPath();
              bolt.path.forEach(([x, y], i) =>
                i ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y)
              );
              ctx!.strokeStyle = "rgba(255,247,220,0.35)";
              ctx!.lineWidth = 7;
              ctx!.stroke();
              ctx!.strokeStyle = "rgba(255,253,245,0.95)";
              ctx!.lineWidth = 2.2;
              ctx!.stroke();
            }
          }
        }
      }

      if (running) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Don't animate a card nobody is looking at — neither a hidden tab nor a
    // card scrolled out of view.
    let visible = true;
    let tabOpen = true;
    const sync = () => {
      const should = visible && tabOpen;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const onVisibility = () => {
      tabOpen = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // H2: a hidden tab was handled, but a card scrolled far below the fold
    // kept a full particle loop running.
    const onScreen = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "80px" }
    );
    onScreen.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      observer.disconnect();
      onScreen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [scene, full, windDirection, pop]);

  return <canvas ref={ref} className="absolute inset-0 size-full" aria-hidden />;
}
