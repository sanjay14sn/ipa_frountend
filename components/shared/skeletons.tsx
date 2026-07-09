import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeleton primitives — the loading hierarchy is: route/section first paint =
 * skeleton; DataTable keeps its built-in pulse rows; Loader2 only for
 * in-button mutation pending. Each primitive matches the geometry of the
 * content it stands in for so the swap causes no layout shift.
 *
 * NOTE: PageSkeleton ships in Phase 2 to back the three route loading.tsx
 * files; the remaining primitives from CMP-01 land in Phase 4.
 */

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
