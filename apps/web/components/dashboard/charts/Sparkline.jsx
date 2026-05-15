"use client";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { APPLE_BLUE } from "./colors";
import { ChartGradient } from "./gradients";

export function Sparkline({ data, color = APPLE_BLUE, height = 32, idHint = "" }) {
  const series = (data || []).map((v, i) => ({
    i,
    v: typeof v === "number" ? v : v?.value || 0,
  }));
  if (series.length < 2) {
    return <div style={{ height }} />;
  }
  const gid = `spark-${idHint || Math.random().toString(36).slice(2, 7)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <ChartGradient id={gid} color={color} fromOpacity={0.32} toOpacity={0} />
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gid})`}
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
