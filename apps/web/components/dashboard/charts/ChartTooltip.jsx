"use client";
import { motion } from "motion/react";

export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => v,
  nameFormatter = (n) => n,
}) {
  if (!active || !payload?.length) return null;
  const renderedLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none rounded-md bg-card px-3 py-2 text-[12px] leading-[1.33] tracking-[-0.12px] shadow-card ring-1 ring-black/[0.06]"
    >
      {renderedLabel && (
        <div className="mb-1 font-medium text-foreground">{renderedLabel}</div>
      )}
      <div className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: p.color || p.fill || p.stroke }}
            />
            <span className="text-muted-foreground">{nameFormatter(p.name)}</span>
            <span className="ml-auto font-medium text-foreground">
              {valueFormatter(p.value, p)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
