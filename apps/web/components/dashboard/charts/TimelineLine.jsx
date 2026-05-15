"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APPLE_BLUE, APPLE_GREY, APPLE_TEXT } from "./colors";
import { ChartGradient } from "./gradients";
import { ChartTooltip } from "./ChartTooltip";

export function TimelineLine({
  data,
  height = 220,
  color = APPLE_BLUE,
  valueLabel = "Applications",
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <ChartGradient id="timeline-fill" color={color} fromOpacity={0.32} toOpacity={0} />
        </defs>
        <CartesianGrid stroke={APPLE_GREY} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: APPLE_TEXT, fontSize: 11 }}
          tickFormatter={(d) => {
            const dt = new Date(d);
            return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          }}
          tickLine={false}
          axisLine={false}
          minTickGap={20}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: APPLE_TEXT, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ stroke: APPLE_BLUE, strokeOpacity: 0.18, strokeWidth: 1 }}
          content={
            <ChartTooltip
              labelFormatter={(d) =>
                new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric" })
              }
              nameFormatter={() => valueLabel}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill="url(#timeline-fill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
