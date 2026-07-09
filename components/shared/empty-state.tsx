import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  /** Secondary guidance line. */
  hint?: string;
  /** Next-action slot, e.g. a "New material request" button. */
  action?: React.ReactNode;
  /** Dense variant for inside table bodies. */
  compact?: boolean;
  className?: string;
}

/**
 * The one empty-state component. Copy standard (B-P5): unfiltered list →
 * "No <things> yet"; filtered list → "No <things> match your filters";
 * sentence case; no trailing period. Distinct from error states (R7):
 * a fetch failure must never render as an empty state.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  hint,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        compact ? "py-6" : "py-10",
        className,
      )}
    >
      <Icon
        className={cn(
          "text-muted-foreground opacity-60",
          compact ? "h-8 w-8" : "h-10 w-10",
        )}
      />
      <p className="text-sm text-muted-foreground">{title}</p>
      {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
