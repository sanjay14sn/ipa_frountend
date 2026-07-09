import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface PageHeaderCardProps {
  /** Pill above the title (ModulePill slots here). */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action cluster. */
  actions?: ReactNode;
  /** Extras below the title row (tab strip, headerExtras). */
  children?: ReactNode;
  /** Strip border/shadow when hosted inside another card. */
  embedded?: boolean;
  className?: string;
}

/**
 * The one page-header card (R6: one h1 per page; hub sections never render
 * their own title card). TablePageShell and PageTabs delegate here.
 */
export function PageHeaderCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  embedded = false,
  className,
}: PageHeaderCardProps) {
  return (
    <div
      data-testid="page-header-card"
      className={cn(
        "px-4 py-4 sm:px-5",
        !embedded && "rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-2xl text-card-foreground">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
