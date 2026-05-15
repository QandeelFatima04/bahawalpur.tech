"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APPLE_BLUE, APPLE_GREY, APPLE_TEXT, tierColor } from "./colors";
import { ChartTooltip } from "./ChartTooltip";

export function HorizontalBars({ data, height = 240, color, valueLabel = "Applicants" }) {
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={APPLE_GREY} horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: APPLE_TEXT, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: APPLE_TEXT, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,113,227,0.05)" }}
          content={<ChartTooltip nameFormatter={() => valueLabel} />}
        />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          barSize={14}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={color || entry.color || tierColor(entry.value, max)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
