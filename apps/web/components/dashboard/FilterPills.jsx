"use client";
import { motion, LayoutGroup } from "motion/react";
import { cn } from "@/lib/utils";

export function FilterPills({ items, value, onChange, layoutId = "filter-pills" }) {
  return (
    <LayoutGroup id={layoutId}>
      <div className="inline-flex flex-wrap items-center gap-1 rounded-pill bg-[rgba(0,0,0,0.04)] p-1">
        {items.map((it) => {
          const isActive = it.key === value;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange?.(it.key)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`${layoutId}-bg`}
                  className="absolute inset-0 rounded-pill bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{it.label}</span>
              {it.count != null && (
                <span
                  className={cn(
                    "relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-accent text-white"
                      : "bg-[rgba(0,0,0,0.06)] text-foreground"
                  )}
                >
                  {it.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
