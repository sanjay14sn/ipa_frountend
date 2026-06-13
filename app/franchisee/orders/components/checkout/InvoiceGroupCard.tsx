"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/currency-utils";

type CheckoutGroupKind = "KIT" | "STUDENT" | "CI";

interface CheckoutCostRow {
  label: string;
  /** Per-unit (multiplied by kitQty when present) */
  unit?: number;
  /** Fixed amount (student-style) */
  amount?: number;
  /** GST contribution per unit (multiplied by kitQty). 0 for KIT rows. */
  gstUnit?: number;
  /** Fixed GST contribution (student-style). 0 for KIT rows. */
  gstAmount?: number;
}

interface CheckoutLineItem {
  name: string;
  quantity: number;
}

interface CheckoutTshirtBreakdownRow {
  tshirtItemId: number | null;
  tshirtName: string | null;
  quantity: number;
}

interface InvoiceGroupCardProps {
  kind: CheckoutGroupKind;
  title: string;
  subtitle?: string;
  kitQty?: number;
  free?: boolean;
  costs?: CheckoutCostRow[];
  /** T-shirt breakdown for kit groups — rendered between costs and items. */
  tshirtBreakdown?: CheckoutTshirtBreakdownRow[];
  items: CheckoutLineItem[];
  totalAmount: number;
  /** When true, hide remove control (finalized order / row invoice). */
  readOnly?: boolean;
  onRemove?: () => void;
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
  tshirtBreakdown,
  items,
  totalAmount,
  readOnly = false,
  onRemove,
  removeAriaLabel = "Remove from invoice",
}: InvoiceGroupCardProps) {
  const qty = kitQty ?? 1;
  const showRemove = !readOnly && onRemove != null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindStyles(kind)}`}
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
            {formatRupees(0)}
          </span>
        ) : (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-card-foreground">
            {formatRupees(totalAmount)}
          </span>
        )}
        {showRemove ? (
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
        ) : (
          <span className="h-8 w-8 shrink-0" aria-hidden />
        )}
      </div>

      {costs && costs.length > 0 && !free ? (
        <div className="divide-y divide-border border-b border-border">
          {costs.map((c, i) => {
            const isUnit = c.unit != null;
            const rowAmount = isUnit ? c.unit! * qty : (c.amount ?? 0);
            // Only KIT-row GST is meaningfully different from "0"; pass it
            // through but never derive (caller decides). Skip the GST hint
            // line entirely when there's no GST on this category.
            const rowGst = isUnit
              ? (c.gstUnit ?? 0) * qty
              : (c.gstAmount ?? 0);
            return (
              <div
                key={`${c.label}-${i}`}
                className="grid grid-cols-[1fr_auto_auto] gap-2 px-4 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="text-muted-foreground">{c.label}</span>
                  {rowGst > 0 ? (
                    <span className="text-[11px] text-muted-foreground/80">
                      incl. 18% GST {formatRupees(rowGst)}
                    </span>
                  ) : null}
                </div>
                <span className="text-right tabular-nums text-muted-foreground">
                  {isUnit
                    ? `${formatRupees(c.unit!)} × ${qty}`
                    : formatRupees(c.amount ?? 0)}
                </span>
                <span className="w-24 text-right font-medium tabular-nums text-card-foreground">
                  {formatRupees(rowAmount)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {tshirtBreakdown && tshirtBreakdown.length > 0 ? (
        <div className="border-b border-border">
          <div className="bg-muted/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            T-shirts
          </div>
          <div className="divide-y divide-border">
            {tshirtBreakdown.map((t, i) => (
              <div
                key={`tshirt-${t.tshirtItemId ?? "none"}-${i}`}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="truncate text-card-foreground">
                  {t.tshirtName ?? "No t-shirt selected"}
                </span>
                <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                  ×{t.quantity}
                </span>
              </div>
            ))}
          </div>
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
