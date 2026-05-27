import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContactPillProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  className?: string;
}

export function ContactPill({
  icon: Icon,
  label,
  value,
  className,
}: ContactPillProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/50">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs text-card-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

interface ContactPillGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const COL_CLASS: Record<NonNullable<ContactPillGridProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export function ContactPillGrid({
  children,
  columns = 2,
  className,
}: ContactPillGridProps) {
  return (
    <div className={cn("grid gap-2", COL_CLASS[columns], className)}>
      {children}
    </div>
  );
}
