"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { APPLE_BLUE } from "./colors";
import { ChartTooltip } from "./ChartTooltip";

export function PipelineDonut({ data, height = 220, centerLabel, centerValue }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[180px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-[14px] font-medium text-foreground">Nothing in flight yet.</p>
        <p className="text-[12px] text-muted-foreground">Apply to a role and it shows up here.</p>
      </div>
    );
  }
  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            strokeWidth={0}
            paddingAngle={2}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color || APPLE_BLUE} />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            content={<ChartTooltip nameFormatter={(n) => n} valueFormatter={(v) => `${v}`} />}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em]">
          {centerValue ?? total}
        </div>
        {centerLabel && (
          <div className="mt-1 text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {centerLabel}
          </div>
        )}
      </div>
    </div>
  );
}
