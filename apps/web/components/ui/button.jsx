"use client";
import { forwardRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Apple-style buttons: filled blue, filled dark, outline pill, ghost.
// Radii: rectangular CTAs use sm (8px); pill links use pill (980px).
const VARIANTS = {
  primary:
    "bg-accent text-white hover:bg-[#0077ed] active:bg-[#0068d0] disabled:bg-[#b8b8bd] disabled:text-white",
  dark:
    "bg-onyx text-white hover:bg-[#2a2a2d] active:bg-[#3a3a3f] disabled:bg-[#b8b8bd]",
  secondary:
    "bg-[#fafafc] text-foreground border border-[rgba(0,0,0,0.08)] hover:bg-muted active:bg-[#ededf2]",
  destructive:
    "bg-destructive text-white hover:bg-[#ba0010] active:bg-[#9e000e]",
  success:
    "bg-success text-white hover:bg-[#1a6f33] active:bg-[#16602c]",
  ghost:
    "bg-transparent text-foreground hover:bg-[rgba(0,0,0,0.05)] active:bg-[rgba(0,0,0,0.08)]",
  outline:
    "bg-transparent text-accent border border-accent hover:bg-accent/5 active:bg-accent/10",
  "outline-dark":
    "bg-transparent text-white border border-white hover:bg-white/10 active:bg-white/20",
  link:
    "bg-transparent text-link hover:underline underline-offset-4 p-0",
};

const SIZES = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-5 text-[17px]",
  lg: "h-12 px-6 text-[18px]",
  icon: "h-10 w-10 p-0",
};

const SHAPES = {
  rect: "rounded-sm",
  pill: "rounded-pill",
};

export const Button = forwardRef(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    shape = "rect",
    type = "button",
    loading = false,
    disabled,
    children,
    ...props
  },
  ref
) {
  const reduced = useReducedMotion();
  const resolvedShape = variant === "link" ? "rect" : SHAPES[shape] ? shape : "rect";
  const isDisabled = disabled || loading;

  const tapAnim = reduced || isDisabled || variant === "link"
    ? undefined
    : { scale: 0.97 };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      whileTap={tapAnim}
      transition={{ type: "spring", stiffness: 480, damping: 28 }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-normal transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-100",
        SHAPES[resolvedShape],
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      style={{ letterSpacing: "-0.022em" }}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-90")}>
        {children}
      </span>
    </motion.button>
  );
});
