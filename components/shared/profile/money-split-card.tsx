import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { money } from "@/lib/ui-helpers";

export interface MoneySplitEntry {
  label: string;
  amount: number | string | null | undefined;
  hint?: ReactNode;
}

interface MoneySplitCardProps {
  label: string;
  sublabel?: string;
  badge?: string;
  totalAmount: number | string | null | undefined;
  totalLabel?: string;
  splits: MoneySplitEntry[];
  className?: string;
}

function MoneySplitCard({
  label,
  sublabel,
  badge,
  totalAmount,
  totalLabel = "Term Fee",
  splits,
  className,
}: MoneySplitCardProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-card-foreground">
              {label}
            </p>
            {badge ? (
              <Badge
                variant="secondary"
                className="h-4 px-1.5 py-0 text-[10px]"
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          {sublabel ? (
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {totalLabel}
          </p>
          <p className="text-xl font-semibold tabular-nums text-card-foreground">
            {money(totalAmount)}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "grid gap-2",
          splits.length === 2
            ? "grid-cols-2"
            : splits.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 md:grid-cols-4",
        )}
      >
        {splits.map((s) => (
          <div key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums text-card-foreground">
              {money(s.amount)}
            </p>
            {s.hint ? (
              <p className="text-[11px] leading-tight text-muted-foreground">
                {s.hint}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
