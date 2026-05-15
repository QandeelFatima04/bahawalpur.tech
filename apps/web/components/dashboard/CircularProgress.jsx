// Inline SVG ring. No animation, accessible label, sized by `size` prop.
export function CircularProgress({ value = 0, size = 80, stroke = 8, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || `${pct}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-accent transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute font-display text-[18px] font-semibold tracking-[-0.01em]">
        {pct}%
      </span>
    </div>
  );
}
