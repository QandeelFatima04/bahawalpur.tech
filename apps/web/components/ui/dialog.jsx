"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const MotionOverlay = motion.create(DialogPrimitive.Overlay);

export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <MotionOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <DialogPrimitive.Content
        className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none"
        {...props}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 2 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className={cn(
            "relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-card shadow-[0_30px_60px_rgba(0,0,0,0.24)]",
            className
          )}
        >
          <div className="overflow-y-auto p-8">{children}</div>
          <DialogPrimitive.Close className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-pill text-[rgba(0,0,0,0.48)] transition-colors hover:bg-[rgba(0,0,0,0.06)] hover:text-foreground">
            <X size={16} />
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("mb-5 space-y-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-display text-[24px] font-semibold leading-[1.17] tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn(
        "text-[14px] leading-[1.43] tracking-[-0.016em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("mt-6 flex flex-wrap justify-end gap-2", className)}
      {...props}
    />
  );
}
