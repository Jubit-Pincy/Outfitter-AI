"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Enter-only route transition. It is a CSS animation on purpose: driving it
 * from JavaScript would paint the page at opacity 0 until hydration lands,
 * so a slow load would show nothing at all. Keying on the pathname restarts
 * the animation on each navigation.
 *
 * /weather fades without the slide: an animated transform on this element
 * would make it the containing block for the full-page `position: fixed` sky,
 * clipping the scene to the content column. Both class strings are written out
 * in full because Tailwind only sees literal class names.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const enter = pathname.startsWith("/weather")
    ? "animate-[page-fade_0.24s_ease-out_both] motion-reduce:animate-none"
    : "animate-[page-enter_0.24s_ease-out_both] motion-reduce:animate-none";

  return (
    <div key={pathname} className={enter}>
      {children}
    </div>
  );
}
