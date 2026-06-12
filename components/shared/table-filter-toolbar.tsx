"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TableToolbarPanel } from "./table-shell";

interface TableFilterToolbarProps {
  title?: string;
  children: ReactNode;
  onApply?: () => void;
  onClear?: () => void;
  applyLabel?: string;
  clearLabel?: string;
  className?: string;
}

/**
 * Wraps a `TableToolbarPanel` with a consistent label + apply/clear footer.
 * Drop filter inputs in as children. Omit `onApply` / `onClear` to render
 * just the surface without a button row.
 */
function TableFilterToolbar({
  title,
  children,
  onApply,
  onClear,
  applyLabel = "Apply",
  clearLabel = "Clear",
  className,
}: TableFilterToolbarProps) {
  return (
    <TableToolbarPanel className={cn("space-y-3", className)}>
      {title ? (
        <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        {children}
        {(onApply || onClear) && (
          <div className="flex gap-2">
            {onApply ? (
              <Button type="button" onClick={onApply}>
                {applyLabel}
              </Button>
            ) : null}
            {onClear ? (
              <Button type="button" variant="outline" onClick={onClear}>
                {clearLabel}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </TableToolbarPanel>
  );
}
