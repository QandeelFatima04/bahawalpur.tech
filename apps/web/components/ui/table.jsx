import { cn } from "@/lib/utils";

export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-[rgba(0,0,0,0.06)]">
      <table
        className={cn("w-full caption-bottom text-[14px]", className)}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }) {
  return (
    <thead
      className={cn(
        "bg-[#fafafc] text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }) {
  return (
    <tbody
      className={cn("divide-y divide-[rgba(0,0,0,0.06)] bg-card", className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }) {
  return (
    <tr
      className={cn("transition-colors hover:bg-[rgba(0,0,0,0.02)]", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }) {
  return <th className={cn("px-4 py-3 font-semibold", className)} {...props} />;
}

export function Td({ className, ...props }) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}
