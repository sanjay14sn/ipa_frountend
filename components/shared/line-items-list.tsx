import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/currency-utils";

export interface LineItem {
  label: React.ReactNode;
  /** Secondary line under the label (SKU, level, notes…). */
  meta?: React.ReactNode;
  qty?: number;
  unitAmount?: number;
  amount: number;
}

export interface LineItemsListProps {
  items: LineItem[];
  /** Totals footer slot rendered under the rows. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Invoice line rows — the one `1fr auto auto` row grammar
 * (name · unit×qty · amount).
 */
export function LineItemsList({ items, footer, className }: LineItemsListProps) {
  return (
    <div data-testid="line-items-list" className={cn("space-y-1.5", className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate text-card-foreground">{item.label}</div>
            {item.meta ? (
              <div className="truncate text-xs text-muted-foreground">
                {item.meta}
              </div>
            ) : null}
          </div>
          <div className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {item.unitAmount !== undefined && item.qty !== undefined
              ? `${formatRupees(item.unitAmount)} × ${item.qty}`
              : item.qty !== undefined
                ? `× ${item.qty}`
                : null}
          </div>
          <div className="whitespace-nowrap text-right tabular-nums text-card-foreground">
            {formatRupees(item.amount)}
          </div>
        </div>
      ))}
      {footer ? <div className="pt-1.5">{footer}</div> : null}
    </div>
  );
}
