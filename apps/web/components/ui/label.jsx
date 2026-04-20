import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "mb-1.5 inline-block text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
