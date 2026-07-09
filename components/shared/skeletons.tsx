import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — the loading hierarchy is: route/section first paint =
 * skeleton; DataTable keeps its built-in pulse rows; Loader2 only for
 * in-button mutation pending. Each primitive matches the geometry of the
 * content it stands in for so the swap causes no layout shift.
 */

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/**
 * The canonical table card: header band on bg-muted/40 (mirrors the
 * customized ui/table TableHeader), then `rows` h-12 rows with one h-4 pulse
 * bar per column — the exact geometry of DataTable's built-in pulse rows.
 */
export function TableSkeleton({
  rows = 8,
  cols = 5,
  className,
}: TableSkeletonProps) {
  return (
    <div
      data-testid="table-skeleton"
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex gap-3 bg-muted/40 px-3 py-2.5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="flex h-12 items-center gap-3 border-t border-border px-3"
        >
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface PageSkeletonProps {
  /** Render a PageHeaderCard-shaped title-card skeleton. */
  header?: boolean;
  /** Number of content-card blocks below the header. */
  blocks?: number;
  className?: string;
}

export function PageSkeleton({
  header = true,
  blocks = 2,
  className,
}: PageSkeletonProps) {
  return (
    <div
      data-testid="page-skeleton"
      className={cn("flex flex-col gap-4", className)}
    >
      {header ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
      ) : null}
      {Array.from({ length: blocks }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card px-4 py-4"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export interface StatCardSkeletonProps {
  className?: string;
}

/** Mirrors SummaryStatCard/StatCell: label bar, value bar, icon circle. */
export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div
      data-testid="stat-card-skeleton"
      className={cn(
        "flex items-start justify-between rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  );
}

export interface StatGridSkeletonProps {
  count?: number;
}

export function StatGridSkeleton({ count = 4 }: StatGridSkeletonProps) {
  return (
    <div
      data-testid="stat-grid-skeleton"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export interface CardListSkeletonProps {
  count?: number;
}

/** Card blocks matching the CI receivables grid. */
export function CardListSkeleton({ count = 4 }: CardListSkeletonProps) {
  return (
    <div
      data-testid="card-list-skeleton"
      className="grid max-w-3xl gap-4 sm:grid-cols-2"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
