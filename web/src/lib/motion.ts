import type { Transition, Variants } from "motion/react";

export const EASE_OUT: Transition["ease"] = [0.22, 0.61, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

export const stagger = (staggerChildren = 0.06): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren: 0.04 } },
});

export const cardPop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};
