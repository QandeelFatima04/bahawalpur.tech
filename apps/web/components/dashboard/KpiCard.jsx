"use client";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { NumberFlow } from "@/components/motion";
import { Sparkline } from "./charts";
import { cn } from "@/lib/utils";

const TONE = {
  default: {
    ring: "ring-black/[0.04]",
    bg: "bg-card",
    accent: "text-foreground",
    sparkColor: "#0071e3",
  },
  accent: {
    ring: "ring-accent/30",
    bg: "bg-accent-tint",
    accent: "text-accent",
    sparkColor: "#0071e3",
  },
  warn: {
    ring: "ring-warn/30",
    bg: "bg-warn-tint",
    accent: "text-warn",
    sparkColor: "#b25000",
  },
  success: {
    ring: "ring-success/30",
    bg: "bg-success-tint",
    accent: "text-success",
    sparkColor: "#1f883d",
  },
};

function Delta({ trend }) {
  if (!trend) return null;
  const { value, direction = value > 0 ? "up" : value < 0 ? "down" : "flat", label } = trend;
  const abs = Math.abs(value);
  const tone =
    direction === "up"
      ? "text-success bg-success-tint"
      : direction === "down"
      ? "text-warn bg-warn-tint"
      : "text-muted-foreground bg-[rgba(0,0,0,0.04)]";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium", tone)}>
      <Icon size={11} strokeWidth={2.4} />
      <span>{abs}{typeof value === "number" && Number.isInteger(value) ? "" : ""}</span>
      {label && <span className="opacity-70">{label}</span>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  trend,
  sparkline,
  tone = "default",
  className,
}) {
  const reduced = useReducedMotion();
  const t = TONE[tone] || TONE.default;
  const isNumeric = typeof value === "number";
  const muted = !trend && !sparkline && tone === "default";

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={cn(
        "rounded-xl px-5 py-4 ring-1 transition-shadow hover:shadow-card",
        t.ring,
        t.bg,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.06em]",
            muted ? "text-muted-foreground/80" : "text-muted-foreground"
          )}
        >
          {label}
        </div>
        {icon && (
          <div className={cn("grid h-7 w-7 place-items-center rounded-pill", muted ? "text-muted-foreground" : t.accent)}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-3">
        <div className="font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.01em]">
          {isNumeric ? <NumberFlow value={value} /> : value}
        </div>
        {trend && <Delta trend={trend} />}
      </div>
      {hint && (
        <div className="mt-1 text-[13px] leading-[1.3] text-muted-foreground">
          {hint}
        </div>
      )}
      {sparkline && sparkline.length >= 2 && (
        <div className="mt-3">
          <Sparkline data={sparkline} color={t.sparkColor} height={32} />
        </div>
      )}
    </motion.div>
  );
}
