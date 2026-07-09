"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ExpandedDetailSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function ExpandedDetailSurface({
  children,
  className,
}: ExpandedDetailSurfaceProps) {
  return <div className={cn("bg-accent/30", className)}>{children}</div>;
}

interface ExpandedDetailSectionProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function ExpandedDetailSection({
  title,
  children,
  className,
  description,
  actions,
}: ExpandedDetailSectionProps) {
  return (
    <section className={cn("p-3 md:p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface DetailFieldsGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

const fieldGridCols: Record<NonNullable<DetailFieldsGridProps["columns"]>, string> =
  {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

export function DetailFieldsGrid({
  children,
  className,
  columns = 3,
}: DetailFieldsGridProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-5 gap-y-2 text-sm text-foreground",
        fieldGridCols[columns],
        className,
      )}
    >
      {children}
    </dl>
  );
}

interface DetailFieldProps {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4;
  mono?: boolean;
}

const fieldSpanClasses: Record<NonNullable<DetailFieldProps["span"]>, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
  4: "sm:col-span-2 lg:col-span-3 xl:col-span-4",
};

export function DetailField({
  label,
  value,
  className,
  span = 1,
  mono,
}: DetailFieldProps) {
  return (
    <div className={cn("min-w-0", fieldSpanClasses[span], className)}>
      <dt
        className={cn(
          "text-muted-foreground",
          mono
            ? "text-[10px] font-semibold uppercase tracking-widest"
            : "text-xs",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words font-medium text-foreground",
          mono && "rounded bg-muted px-1.5 py-1 font-mono text-xs font-normal",
        )}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

interface DetailCardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  meta?: ReactNode;
}

export function DetailCard({
  children,
  className,
  title,
  meta,
}: DetailCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-sm", className)}>
      {title || meta ? (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
          <div className="font-medium text-card-foreground">{title}</div>
          {meta ? (
            <div className="text-xs text-muted-foreground">{meta}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

interface DetailMessageProps {
  children: ReactNode;
  className?: string;
  tone?: "default" | "destructive";
}

export function DetailMessage({
  children,
  className,
  tone = "default",
}: DetailMessageProps) {
  return (
    <p
      className={cn(
        "text-sm",
        tone === "destructive" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export interface DetailSubheadingProps {
  children: React.ReactNode;
  /** Right-aligned action slot. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Sub-section heading inside kit detail sections — the level between the
 * section title and field labels (CC-02/CC-04). Codifies the de-facto
 * `text-sm font-semibold text-foreground` style.
 */
export function DetailSubheading({
  children,
  actions,
  className,
}: DetailSubheadingProps) {
  return (
    <div
      data-testid="detail-subheading"
      className={cn("flex items-center justify-between gap-2", className)}
    >
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
