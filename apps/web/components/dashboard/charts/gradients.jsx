"use client";
import { APPLE_BLUE, SUCCESS, WARN } from "./colors";

export function ChartGradient({ id, color = APPLE_BLUE, fromOpacity = 0.28, toOpacity = 0 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={fromOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={toOpacity} />
    </linearGradient>
  );
}

export function ChartGradients({ idPrefix = "g" }) {
  return (
    <defs>
      <ChartGradient id={`${idPrefix}-accent`} color={APPLE_BLUE} />
      <ChartGradient id={`${idPrefix}-success`} color={SUCCESS} />
      <ChartGradient id={`${idPrefix}-warn`} color={WARN} />
    </defs>
  );
}
