import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface QuickAccessCardProps {
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  /**
   * Optional count chip. Pass undefined to hide — e.g. on fetch error;
   * never show a fake 0.
   */
  count?: number;
  className?: string;
}

export function QuickAccessCard({
  title,
  description,
  href,
  icon: Icon,
  count,
  className,
}: QuickAccessCardProps) {
  return (
    <Link
      href={href}
      data-testid="quick-access-card"
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent",
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-card-foreground">
          {title}
        </span>
        {description ? (
          <span className="block truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {count !== undefined ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
          {count}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
