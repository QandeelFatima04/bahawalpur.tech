"use client";
import { cn } from "@/lib/utils";

export function tierForScore(score) {
  if (score >= 75) return "strong";
  if (score >= 50) return "close";
  return "stretch";
}

const TIER_COPY = {
  strong: "Strong fit",
  close: "Close",
  stretch: "Stretch",
};

const TIER_CLASS = {
  strong: "bg-success-tint text-success ring-success/30",
  close: "bg-accent-tint text-accent ring-accent/30",
  stretch: "bg-warn-tint text-warn ring-warn/30",
};

export function MatchScoreChip({ score = 0, size = "md", label, className }) {
  const tier = tierForScore(score);
  const tierLabel = label || TIER_COPY[tier];

  if (size === "lg") {
    return (
      <div
        className={cn(
          "inline-flex flex-col items-end rounded-xl px-3 py-2 ring-1 transition-shadow",
          TIER_CLASS[tier],
          className
        )}
      >
        <span className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em]">
          {Math.round(score)}%
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] opacity-80">
          {tierLabel}
        </span>
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold ring-1",
          TIER_CLASS[tier],
          className
        )}
      >
        <span>{tierLabel}</span>
        <span className="opacity-70">·</span>
        <span>{Math.round(score)}%</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[12px] font-semibold ring-1",
        TIER_CLASS[tier],
        className
      )}
    >
      <span>{tierLabel}</span>
      <span className="opacity-70">·</span>
      <span>{Math.round(score)}%</span>
    </span>
  );
}
