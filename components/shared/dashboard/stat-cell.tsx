import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StatCellProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Secondary line under the value. */
  sub?: React.ReactNode;
  /**
   * Amber attention chip deep-linking to its queue. Renders ONLY when
   * count > 0 (R4: zero shows nothing; no fake trends, ever).
   */
  pendingChip?: { count: number; href: string };
  /** Red state chip, e.g. "Overdue". */
  alertChip?: { label: string; href?: string };
  className?: string;
}

/**
 * Dashboard KPI cell. No trend props by design — R4 bans trend arrows and
 * percent badges outright.
 */
export function StatCell({
  label,
  value,
  icon: Icon,
  sub,
  pendingChip,
  alertChip,
  className,
}: StatCellProps) {
  const showPending = !!pendingChip && pendingChip.count > 0;
  const alertBody = alertChip ? (
    <span className="inline-flex h-5 items-center rounded-full bg-destructive-soft px-2 text-[11px] font-medium text-destructive-soft-foreground">
      {alertChip.label}
    </span>
  ) : null;

  return (
    <div
      data-testid="stat-cell"
      className={cn("space-y-2 px-4 py-4 sm:px-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        {Icon ? (
          <Icon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>
      <div className="text-3xl font-normal leading-none text-card-foreground tabular-nums">
        {value}
      </div>
      {sub ? (
        <div className="max-w-44 text-xs leading-snug text-muted-foreground">
          {sub}
        </div>
      ) : null}
      {showPending || alertChip ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {showPending ? (
            <Link
              href={pendingChip.href}
              className="inline-flex h-5 items-center gap-1 rounded-full bg-warning-soft px-2 text-[11px] font-medium text-warning-soft-foreground hover:bg-warning-soft/80"
            >
              {pendingChip.count} pending
            </Link>
          ) : null}
          {alertChip?.href ? (
            <Link href={alertChip.href} className="hover:opacity-80">
              {alertBody}
            </Link>
          ) : (
            alertBody
          )}
        </div>
      ) : null}
    </div>
  );
}
