import { cn } from "@/lib/utils";

// Single-stat tile. Small label up top, big number, optional helper text + icon.
// Stays in the Apple-minimal palette — accent is reserved for actionable highlights.
export function KpiCard({ label, value, hint, icon, tone = "default", className }) {
  const toneClass =
    tone === "accent"
      ? "ring-accent/30 bg-accent/[0.04]"
      : tone === "warn"
      ? "ring-warn/30 bg-warn/[0.04]"
      : tone === "success"
      ? "ring-success/30 bg-success/[0.04]"
      : "ring-black/[0.04] bg-card";

  return (
    <div
      className={cn(
        "rounded-xl px-5 py-4 ring-1 transition-colors",
        toneClass,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-1 font-display text-[28px] font-semibold leading-[1.14] tracking-[-0.01em]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[13px] leading-[1.3] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}
