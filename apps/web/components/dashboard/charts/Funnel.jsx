"use client";
import { motion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { APPLE_BLUE } from "./colors";

export function Funnel({ stages, showDrops = true }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const widthPct = Math.max(6, (s.count / max) * 100);
        const prev = stages[i - 1];
        const drop = prev ? prev.count - s.count : 0;
        const dropPct = prev && prev.count ? Math.round((drop / prev.count) * 100) : 0;
        return (
          <div key={s.key}>
            {showDrops && prev && drop > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                className="ml-36 flex items-center gap-1.5 pl-2 text-[11px] leading-none text-warn"
              >
                <ArrowDown size={10} className="opacity-70" />
                <span className="font-medium">−{drop}</span>
                <span className="opacity-60">({dropPct}% dropped)</span>
              </motion.div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-36 shrink-0 text-[13px] text-muted-foreground">
                {s.label}
              </div>
              <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    duration: 0.6,
                    delay: 0.06 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-md"
                  style={{
                    background: s.color || APPLE_BLUE,
                    opacity: 0.92,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[12px] font-medium">
                  <span className="text-white drop-shadow-sm">{s.count}</span>
                  <span className="text-muted-foreground">
                    {max ? `${Math.round((s.count / max) * 100)}%` : "0%"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
