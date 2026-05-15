"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function Card({ className, tone = "light", interactive = false, ...props }) {
  const reduced = useReducedMotion();
  const toneClass =
    tone === "dark" ? "bg-surface-1 text-white" : "bg-card text-foreground";
  const ringClass = tone === "dark" ? "" : "ring-1 ring-black/[0.04]";
  const baseClass = cn(
    "rounded-xl p-6 transition-shadow",
    toneClass,
    ringClass,
    interactive && "cursor-pointer",
    className
  );

  if (interactive) {
    return (
      <motion.div
        whileHover={reduced ? undefined : { y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.995 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className={cn(
          baseClass,
          "hover:shadow-card"
        )}
        {...props}
      />
    );
  }

  return <div className={baseClass} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("mb-4 flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        "font-display text-[21px] font-semibold leading-[1.19] tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn(
        "text-[14px] leading-[1.43] tracking-[-0.016em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("space-y-4", className)} {...props} />;
}
