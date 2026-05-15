"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TONE = {
  default: "ring-accent/20 bg-accent-tint",
  warn: "ring-warn/30 bg-warn-tint",
  destructive: "ring-destructive/30 bg-destructive-tint",
  success: "ring-success/30 bg-success-tint",
};

function ActionRow({ action, compact }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        "hover:bg-[rgba(0,0,0,0.04)]",
        compact && "text-[13px]"
      )}
    >
      <span className="mt-0.5 text-muted-foreground group-hover:text-accent">
        {Icon ? <Icon size={14} /> : null}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-medium text-foreground">{action.title}</span>
        {action.hint && (
          <span className="mt-0.5 block text-[12px] leading-[1.35] text-muted-foreground">
            {action.hint}
          </span>
        )}
      </span>
      <ChevronRight size={14} className="mt-1 text-muted-foreground group-hover:text-accent" />
    </button>
  );
}

export function NextActionCard({ actions = [], emptyState }) {
  const [expanded, setExpanded] = useState(false);

  if (!actions.length) {
    return (
      <div className="rounded-xl bg-success-tint p-6 ring-1 ring-success/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 text-success" />
          <div>
            <div className="text-[15px] font-semibold text-foreground">
              {emptyState?.title || "You're caught up."}
            </div>
            <p className="mt-1 text-[14px] leading-[1.45] text-muted-foreground">
              {emptyState?.hint || "Nothing needs your attention right now. Keep an eye on new roles."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [primary, ...rest] = actions;
  const PrimaryIcon = primary.icon;
  const tone = TONE[primary.tone] || TONE.default;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={cn("rounded-xl p-6 ring-1 transition-shadow hover:shadow-card", tone)}
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-card text-accent ring-1 ring-black/[0.04]">
          {PrimaryIcon ? <PrimaryIcon size={18} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Do this next
          </div>
          <h3 className="mt-1 font-display text-[20px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground">
            {primary.title}
          </h3>
          {primary.hint && (
            <p className="mt-1.5 text-[14px] leading-[1.45] text-muted-foreground">
              {primary.hint}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={primary.tone === "warn" ? "primary" : "primary"}
              onClick={primary.onClick}
            >
              {primary.cta || "Open"} →
            </Button>
            {rest.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {expanded ? "Hide" : `${rest.length} more →`}
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {expanded && rest.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mt-3 overflow-hidden"
              >
                <div className="space-y-1 border-t border-black/[0.06] pt-3">
                  {rest.map((a, i) => (
                    <ActionRow key={i} action={a} compact />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
