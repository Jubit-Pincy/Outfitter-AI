"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { LiveRegion } from "./live-region";
import { StoreHydrator } from "./store-hydrator";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <StoreHydrator />
      <LiveRegion />
      {children}
    </MotionConfig>
  );
}
