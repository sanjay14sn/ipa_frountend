import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KeyFactCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  className?: string;
}

export function KeyFactCard({
  icon: Icon,
  label,
  value,
  className,
}: KeyFactCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-card-foreground">{value ?? "—"}</p>
    </div>
  );
}

interface KeyFactsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const COL_CLASS: Record<NonNullable<KeyFactsGridProps["columns"]>, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

export function KeyFactsGrid({
  children,
  columns = 4,
  className,
}: KeyFactsGridProps) {
  return (
    <div className={cn("grid gap-3", COL_CLASS[columns], className)}>
      {children}
    </div>
  );
}
