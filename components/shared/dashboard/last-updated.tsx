"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatLastUpdated } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

export interface LastUpdatedProps {
  updatedAt?: string | number | Date;
  /** Query refetch (R5: dashboards show "Updated Xm ago" + a refresh action). */
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function LastUpdated({
  updatedAt,
  onRefresh,
  isRefreshing = false,
  className,
}: LastUpdatedProps) {
  return (
    <div
      data-testid="last-updated"
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>Updated {formatLastUpdated(updatedAt)}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        <span className="sr-only">Refresh</span>
      </Button>
    </div>
  );
}
