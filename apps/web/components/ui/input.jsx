"use client";
import { forwardRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Input = forwardRef(function Input(
  { className, type = "text", error, hint, success, ...props },
  ref
) {
  const hasError = Boolean(error);
  const showSuccess = Boolean(success) && !hasError;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          ref={ref}
          type={type}
          aria-invalid={hasError || undefined}
          className={cn(
            "input-base",
            "focus:bg-accent-tint",
            hasError &&
              "border-destructive focus:!outline-destructive focus:border-transparent",
            showSuccess && "border-success/40",
            (hasError || showSuccess) && "pr-10",
            className
          )}
          {...props}
        />
        {(hasError || showSuccess) && (
          <div
            className={cn(
              "pointer-events-none absolute inset-y-0 right-3 flex items-center",
              hasError ? "text-destructive" : "text-success"
            )}
          >
            {hasError ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {(error || hint) && (
          <motion.p
            initial={{ opacity: 0, y: -2, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -2, height: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mt-1.5 text-[12px] leading-[1.33] tracking-[-0.12px]",
              hasError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {error || hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});
