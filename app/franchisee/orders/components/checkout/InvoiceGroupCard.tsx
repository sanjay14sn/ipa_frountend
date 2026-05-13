"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export type CheckoutGroupKind = "KIT" | "STUDENT" | "CI";

export interface CheckoutCostRow {
  label: string;
  /** Per-unit (multiplied by kitQty when present) */
  unit?: number;
  /** Fixed amount (student-style) */
  amount?: number;
}

export interface CheckoutLineItem {
  name: string;
  quantity: number;
}

interface InvoiceGroupCardProps {
  kind: CheckoutGroupKind;
  title: string;
  subtitle?: string;
  kitQty?: number;
  free?: boolean;
  costs?: CheckoutCostRow[];
  items: CheckoutLineItem[];
  totalAmount: number;
  onRemove: () => void;
  removeAriaLabel?: string;
}

function kindStyles(kind: CheckoutGroupKind) {
  switch (kind) {
    case "KIT":
    case "STUDENT":
    case "CI":
      return "bg-muted text-card-foreground ring-1 ring-border";
    default:
      return "bg-muted text-muted-foreground ring-1 ring-border";
  }
}

export default function InvoiceGroupCard({
  kind,
  title,
  subtitle,
  kitQty,
  free,
  costs,
  items,
  totalAmount,
  onRemove,
  removeAriaLabel = "Remove from invoice",
}: InvoiceGroupCardProps) {
  const qty = kitQty ?? 1;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${kindStyles(kind)}`}
        >
          {kind}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-card-foreground">
              {title}
            </span>
            {subtitle ? (
              <span className="text-xs text-muted-foreground">· {subtitle}</span>
            ) : null}
            {kitQty != null && kitQty > 1 ? (
              <span className="text-xs font-medium text-muted-foreground">
                ×{kitQty}
              </span>
            ) : null}
          </div>
        </div>
        {free ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
            {currencyFormatter.format(0)}
          </span>
        ) : (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
            {currencyFormatter.format(totalAmount)}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={removeAriaLabel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {costs && costs.length > 0 && !free ? (
        <div className="divide-y divide-border border-b border-border">
          {costs.map((c, i) => {
            const isUnit = c.unit != null;
            const rowAmount = isUnit ? c.unit! * qty : (c.amount ?? 0);
            return (
              <div
                key={`${c.label}-${i}`}
                className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground">{c.label}</span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {isUnit
                    ? `${currencyFormatter.format(c.unit!)} × ${qty}`
                    : currencyFormatter.format(c.amount ?? 0)}
                </span>
                <span className="w-24 text-right font-medium tabular-nums text-card-foreground">
                  {currencyFormatter.format(rowAmount)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Items
        </div>
      </div>
      <div className="max-h-48 divide-y divide-border overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            No items.
          </div>
        ) : (
          items.map((it, i) => (
            <div
              key={`${it.name}-${i}`}
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span className="truncate text-card-foreground">{it.name}</span>
              <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                ×{it.quantity}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
