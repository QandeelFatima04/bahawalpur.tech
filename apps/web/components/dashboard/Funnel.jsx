// Hand-rolled hiring funnel. Bars are widths proportional to the largest stage
// (usually "applied"), so a stage with 0 candidates shows an empty thin line —
// keeps the visual rhythm consistent.

export function Funnel({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const widthPct = Math.max(6, (s.count / max) * 100);
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-36 shrink-0 text-[13px] text-muted-foreground">
              {s.label}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/40">
              <div
                className="h-full rounded-md transition-[width] duration-500"
                style={{
                  width: `${widthPct}%`,
                  background: s.color || "#0071e3",
                  opacity: 0.85,
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
        );
      })}
    </div>
  );
}
