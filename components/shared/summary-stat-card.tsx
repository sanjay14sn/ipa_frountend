import { cn } from "@/lib/utils";

interface SummaryStatCardProps {
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function SummaryStatCard({
  label,
  value,
  description,
  className,
}: SummaryStatCardProps) {
  return (
    <div className={cn("space-y-2 px-4 py-4 sm:px-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <div className="text-3xl font-light leading-none text-card-foreground">
        {value}
      </div>
      {description ? (
        <div className="max-w-44 text-xs leading-snug text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}

interface SummaryStatGridProps {
  children: React.ReactNode;
  className?: string;
}

export function SummaryStatGrid({ children, className }: SummaryStatGridProps) {
  return (
    <div
      className={cn(
        "grid divide-y rounded-xl border bg-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
