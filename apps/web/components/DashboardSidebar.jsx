"use client";
import Link from "next/link";
import { motion, LayoutGroup } from "motion/react";
import { cn } from "@/lib/utils";

export function DashboardSidebar({ items = [], activeKey, onSelect, footer }) {
  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-110px)] w-60 shrink-0 lg:block">
      <nav className="flex h-full flex-col">
        <LayoutGroup id="sidebar-nav">
          <ul className="flex-1 space-y-0.5">
            {items.map((item) => {
              const isActive = item.key === activeKey;
              const Icon = item.icon;
              const inner = (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-md bg-accent-tint"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-bar"
                      className="absolute left-0 top-1 bottom-1 w-[2px] rounded-pill bg-accent"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {Icon && (
                    <span
                      className={cn(
                        "relative z-10 grid h-5 w-5 place-items-center",
                        isActive ? "text-accent" : "text-muted-foreground"
                      )}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>
                  )}
                  <span className="relative z-10 flex-1 truncate">{item.label}</span>
                  {item.badge != null && item.badge !== 0 && (
                    <span
                      className={cn(
                        "relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-semibold",
                        isActive
                          ? "bg-accent text-white"
                          : "bg-[rgba(0,0,0,0.06)] text-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              );

              const className = cn(
                "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              );

              return (
                <li key={item.key}>
                  {item.href ? (
                    <Link href={item.href} className={className}>
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect?.(item.key)}
                      className={className}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
        {footer && <div className="mt-4 border-t border-black/[0.06] pt-4">{footer}</div>}
      </nav>
    </aside>
  );
}
