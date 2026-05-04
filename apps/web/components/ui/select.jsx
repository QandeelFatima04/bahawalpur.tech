import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn("input-base appearance-none pr-10", className)}
      {...props}
    >
      {children}
    </select>
  );
});
