import { cn } from "@/lib/utils";

// Apple uses almost no color — these badges are soft neutrals with the
// semantic ones leaning on minimal tint so the UI stays calm.
const VARIANTS = {
  default: "bg-[rgba(0,0,0,0.06)] text-foreground",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warn: "bg-warn/10 text-warn",
  destructive: "bg-destructive/10 text-destructive",
  outline: "ring-1 ring-[rgba(0,0,0,0.12)] text-foreground",
  dark: "bg-white/10 text-white",
};

export function Badge({ variant = "default", className, ...props }) {
  return (
    <span className={cn("badge-base", VARIANTS[variant], className)} {...props} />
  );
}
