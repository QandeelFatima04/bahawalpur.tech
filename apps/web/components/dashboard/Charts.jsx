"use client";
// Thin wrappers around Recharts so we only import it from one place. All charts
// use ResponsiveContainer so they degrade gracefully on mobile widths.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const APPLE_BLUE = "#0071e3";
const APPLE_GREY = "rgba(0,0,0,0.04)";
const APPLE_TEXT = "rgba(0,0,0,0.48)";

export function PipelineDonut({ data, height = 220 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[13px] text-muted-foreground">
        No applications yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          strokeWidth={0}
          paddingAngle={1}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color || APPLE_BLUE} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${value} applications`, name]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TimelineLine({ data, height = 220, color = APPLE_BLUE }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: -16, bottom: 0 }}>
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
          formatter={(value) => [`${value}`, "Applications"]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
          labelFormatter={(d) =>
            new Date(d).toLocaleDateString(undefined, { month: "long", day: "numeric" })
          }
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({ data, height = 240, color = APPLE_BLUE }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 6, right: 16, left: 4, bottom: 0 }}
      >
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
          width={120}
        />
        <Tooltip
          formatter={(v) => [`${v}`, "Applicants"]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
