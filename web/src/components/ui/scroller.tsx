"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";

/**
 * A horizontal strip that scrolls under a mouse as well as a trackpad.
 *
 * A trackpad swipes sideways on its own, but a wheel only sends vertical
 * deltas — and with the scrollbar hidden there is no thumb to drag either, so
 * a mouse had no way to reach the far end of the row. This turns that vertical
 * wheel into horizontal movement, and lets the strip be dragged directly.
 *
 * The wheel listener is registered by hand because React's is passive, and a
 * passive listener cannot call preventDefault to stop the page scrolling too.
 */
export function Scroller({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // A sideways gesture is already going the right way; leave it alone.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      // Wheel notches arrive as large jumps and want easing; a trackpad's
      // fine deltas are already smooth and easing them would feel laggy.
      const notch = e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50;
      el.scrollBy({
        left: e.deltaMode !== 0 ? e.deltaY * 40 : e.deltaY,
        behavior: notch ? "smooth" : "auto",
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        // The bar itself is hidden — with "show scroll bars: always" the
        // platform draws a grey slab across the card, and the cut-off last
        // cell already says the row scrolls.
        "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
