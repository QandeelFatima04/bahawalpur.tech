"use client";
import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useTransform, useReducedMotion } from "motion/react";
import { APPLE_BLUE } from "./colors";

export function RingProgress({
  value = 0,
  size = 80,
  stroke = 8,
  label,
  color = APPLE_BLUE,
  trackColor = "rgba(0,0,0,0.06)",
  duration = 1.1,
  showLabel = true,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const firstRun = useRef(true);

  useEffect(() => {
    if (reduced) {
      progress.set(pct);
      return;
    }
    const from = firstRun.current ? 0 : progress.get();
    firstRun.current = false;
    const controls = animate(progress, pct, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      from,
    });
    return () => controls.stop();
  }, [pct, duration, progress, reduced]);

  const dashoffset = useTransform(progress, (p) => circumference - (p / 100) * circumference);
  const displayText = useTransform(progress, (p) => `${Math.round(p)}%`);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || `${pct}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashoffset }}
        />
      </svg>
      {showLabel && (
        <motion.span
          className="absolute font-display text-[18px] font-semibold tracking-[-0.01em]"
          style={{ color }}
        >
          {displayText}
        </motion.span>
      )}
    </div>
  );
}
