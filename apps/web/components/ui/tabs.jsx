"use client";
import { createContext, forwardRef, useContext, useId, useState } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const TabsCtx = createContext({ value: undefined, layoutId: "tabs" });

export function Tabs({
  value: controlledValue,
  onValueChange,
  defaultValue,
  children,
  ...props
}) {
  const reactId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolled;
  const handleChange = (next) => {
    if (controlledValue === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <TabsCtx.Provider value={{ value, layoutId: `tabs-pill-${reactId}` }}>
      <TabsPrimitive.Root
        value={controlledValue}
        onValueChange={handleChange}
        defaultValue={defaultValue}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsCtx.Provider>
  );
}

export function TabsList({ className, ...props }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsPrimitive.List
        className={cn(
          "inline-flex h-11 items-center gap-1 rounded-pill bg-[rgba(0,0,0,0.05)] p-1 text-[14px]",
          className
        )}
        {...props}
      />
    </div>
  );
}

export const TabsTrigger = forwardRef(function TabsTrigger(
  { className, children, value, ...props },
  ref
) {
  const ctx = useContext(TabsCtx);
  const isActive = ctx.value === value;
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative inline-flex h-9 items-center justify-center whitespace-nowrap rounded-pill px-4 font-medium transition-colors",
        "text-[rgba(0,0,0,0.6)] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=active]:text-foreground",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.span
          layoutId={ctx.layoutId}
          className="absolute inset-0 -z-0 rounded-pill bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  );
});

export function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-6 focus-visible:outline-none", className)}
      {...props}
    />
  );
}
