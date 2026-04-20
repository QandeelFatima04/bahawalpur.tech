import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-[rgba(0,0,0,0.06)]", className)}
      {...props}
    />
  );
}

export function SkeletonRow({ cols = 4, className }) {
  return (
    <div className={cn("flex gap-3", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 5 }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} className="py-1" />
      ))}
    </div>
  );
}
