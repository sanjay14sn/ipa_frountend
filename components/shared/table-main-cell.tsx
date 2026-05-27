import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableMainCellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  separator?: string;
  className?: string;
}

/**
 * Standard "main column" cell for `DataTable.renderMainCell` callbacks.
 * Title is medium-weight; subtitle is a muted xs string that may be
 * separated from the title by a configurable separator (default " · ").
 */
export function TableMainCell({
  title,
  subtitle,
  separator = " · ",
  className,
}: TableMainCellProps) {
  return (
    <span className={cn("font-medium text-card-foreground", className)}>
      {title}
      {subtitle ? (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {separator}
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
