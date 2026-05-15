"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityFeed({ title = "Lately", items = [], emptyState }) {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-black/[0.04]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] leading-[1.45] text-muted-foreground">
          {emptyState || "Nothing yet. Activity shows up here as it happens."}
        </p>
      ) : (
        <ul className="-mx-1 space-y-0.5">
          {items.slice(0, 6).map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.26, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-2.5 rounded-md px-1 py-1.5"
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center text-muted-foreground",
                    it.tone === "success" && "text-success",
                    it.tone === "warn" && "text-warn",
                    it.tone === "accent" && "text-accent"
                  )}
                >
                  {Icon ? <Icon size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] leading-[1.35] text-foreground">
                    {it.text}
                  </div>
                  {it.meta && (
                    <div className="truncate text-[12px] leading-[1.35] text-muted-foreground">
                      {it.meta}
                    </div>
                  )}
                </div>
                {it.at && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(it.at)}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
