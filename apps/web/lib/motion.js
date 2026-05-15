"use client";
import { useReducedMotion } from "motion/react";

export const spring = { type: "spring", stiffness: 360, damping: 32, mass: 0.9 };
export const springSoft = { type: "spring", stiffness: 240, damping: 28 };
export const ease = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };
export const easeFast = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: ease,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: easeFast,
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: spring,
};

export const stagger = (delay = 0.05) => ({
  animate: { transition: { staggerChildren: delay, delayChildren: 0.02 } },
});

export const staggerItem = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

export function useMotionPrefs() {
  const reduced = useReducedMotion();
  return { reduced };
}
