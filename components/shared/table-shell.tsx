"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/skeletons";

interface TablePageShellProps {
  children: ReactNode;
  className?: string;
  embed?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function TablePageShell({
  children,
  className,
  embed = false,
  title,
  description,
  actions,
}: TablePageShellProps) {
  return (
    <section
      className={cn("space-y-4", !embed && "min-h-full", className)}
    >
      {(title || description || actions) && (
        <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {title ? (
                <h1 className="text-2xl text-card-foreground">{title}</h1>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {children}
    </section>
  );
}

interface TableSectionSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function TableSectionSurface({
  children,
  className,
}: TableSectionSurfaceProps) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

interface TableToolbarPanelProps {
  children: ReactNode;
  className?: string;
}

export function TableToolbarPanel({
  children,
  className,
}: TableToolbarPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TableStatusBarProps {
  children: ReactNode;
  className?: string;
}

export function TableStatusBar({
  children,
  className,
}: TableStatusBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface RawTableSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function RawTableSurface({
  children,
  className,
}: RawTableSurfaceProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TableFeedbackProps {
  className?: string;
  message: string;
}

/**
 * @deprecated Render `TableSkeleton` (components/shared/skeletons) directly.
 * Kept so existing call sites upgrade for free; `message` is announced to
 * screen readers only.
 */
export function TableLoadingState({
  className,
  message,
}: TableFeedbackProps) {
  return (
    <div className={className}>
      <span className="sr-only">{message}</span>
      <TableSkeleton />
    </div>
  );
}

/**
 * @deprecated Render `EmptyState` (components/shared/empty-state) directly —
 * it supports icon/hint/action. Kept so existing call sites upgrade for free.
 */
export function TableEmptyState({
  className,
  message,
}: TableFeedbackProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <EmptyState title={message} />
    </div>
  );
}
