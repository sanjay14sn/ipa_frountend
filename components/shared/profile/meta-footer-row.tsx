import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MetaFactItem {
  label: string;
  value: ReactNode;
}

interface MetaFooterRowProps {
  items: MetaFactItem[];
  className?: string;
}

function MetaFooterRow({ items, className }: MetaFooterRowProps) {
  const cols =
    items.length === 1
      ? "grid-cols-1"
      : items.length === 2
        ? "grid-cols-2"
        : items.length === 3
          ? "grid-cols-3"
          : "grid-cols-2 md:grid-cols-4";
  return (
    <div
      className={cn(
        "grid gap-2 border-t border-border pt-4",
        cols,
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-card-foreground">
            {item.value ?? "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
