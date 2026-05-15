"use client";
import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion, useReducedMotion } from "motion/react";

export function NumberFlow({
  value,
  format = (v) => Math.round(v).toLocaleString(),
  duration = 1.1,
  className,
}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => format(v));
  const firstRun = useRef(true);

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const from = firstRun.current ? 0 : mv.get();
    firstRun.current = false;
    const controls = animate(mv, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      from,
    });
    return () => controls.stop();
  }, [value, duration, mv, reduced]);

  return <motion.span className={className}>{display}</motion.span>;
}
