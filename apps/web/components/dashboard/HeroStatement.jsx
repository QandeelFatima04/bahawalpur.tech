"use client";
import { motion } from "motion/react";
import { NumberFlow } from "@/components/motion";
import { cn } from "@/lib/utils";

export function HeroStatement({ tokens = [], className }) {
  return (
    <div
      className={cn(
        "font-display text-[28px] font-semibold leading-[1.18] tracking-[-0.012em] sm:text-[34px] md:text-[40px] md:leading-[1.12]",
        className
      )}
    >
      {tokens.map((tok, i) => {
        if (tok.type === "text") {
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
              className="text-muted-foreground"
            >
              {tok.value}
            </motion.span>
          );
        }
        if (tok.type === "number") {
          const Tag = tok.onClick ? motion.button : motion.span;
          return (
            <Tag
              key={i}
              type={tok.onClick ? "button" : undefined}
              onClick={tok.onClick}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "font-display font-semibold text-foreground transition-colors",
                tok.onClick &&
                  "underline decoration-accent/0 decoration-2 underline-offset-4 hover:decoration-accent/60 focus-visible:outline-none focus-visible:decoration-accent"
              )}
            >
              <NumberFlow value={tok.value} />
              {tok.suffix ? <span>{tok.suffix}</span> : null}
            </Tag>
          );
        }
        return null;
      })}
    </div>
  );
}
