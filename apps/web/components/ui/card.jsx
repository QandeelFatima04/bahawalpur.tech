import { cn } from "@/lib/utils";

export function Card({ className, tone = "light", ...props }) {
  const toneClass =
    tone === "dark"
      ? "bg-surface-1 text-white"
      : "bg-card text-foreground";
  return (
    <div
      className={cn(
        "rounded-xl p-6",
        toneClass,
        tone === "dark" ? "" : "ring-1 ring-black/[0.04]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("mb-4 flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        "font-display text-[21px] font-semibold leading-[1.19] tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn(
        "text-[14px] leading-[1.43] tracking-[-0.016em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("space-y-4", className)} {...props} />;
}
