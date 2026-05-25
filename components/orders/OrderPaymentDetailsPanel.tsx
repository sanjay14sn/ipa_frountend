"use client";

import { Badge } from "@/components/ui/badge";
import { DetailField, DetailFieldsGrid } from "@/components/shared";
import type { PaymentSummary } from "@/services/order.service";
import {
  formatPaymentDateTime,
  formatRsAmount,
  getMethodSpecificFields,
  methodBadgeClass,
  methodLabel,
} from "@/lib/payment-details-display";

export interface OrderPaymentDetailsPanelProps {
  payment: PaymentSummary;
  /** When true, omit the panel heading (use when wrapped in e.g. ExpandedDetailSection). */
  hideTitle?: boolean;
  className?: string;
  /**
   * Fallback for `payment.goodsGstAmount` when the payment row hasn't been
   * stamped yet (legacy rows created before the GST split fix). Callers that
   * have the linked order in scope should pass `order.gstAmount` here so the
   * "GST (18%)" line still renders for those orders.
   */
  fallbackGoodsGstAmount?: number | string | null;
}

export function OrderPaymentDetailsPanel({
  payment,
  hideTitle = false,
  className = "",
  fallbackGoodsGstAmount = null,
}: OrderPaymentDetailsPanelProps) {
  const currency = payment.currency ?? "INR";
  const methodFields = getMethodSpecificFields(payment);
  // Prefer the payment row's own value; fall back to the linked order's GST
  // so legacy rows (pre-backfill) still surface the line.
  const effectiveGoodsGst =
    payment.goodsGstAmount != null
      ? Number(payment.goodsGstAmount)
      : fallbackGoodsGstAmount != null
        ? Number(fallbackGoodsGstAmount)
        : null;

  return (
    <div
      className={`rounded-xl border border-border/70 bg-muted/30 p-4 ${className}`.trim()}
    >
      {!hideTitle ? (
        <div className="mb-3 text-sm font-semibold text-card-foreground">Payment details</div>
      ) : null}

      <div className="space-y-4">
        <DetailFieldsGrid columns={3}>
          <DetailField
            label="Status"
            value={<Badge variant="outline">{payment.status}</Badge>}
          />
          <DetailField
            label="Method"
            value={
              payment.method ? (
                <Badge variant="outline" className={methodBadgeClass(payment.method)}>
                  {methodLabel(payment.method)}
                </Badge>
              ) : (
                "—"
              )
            }
          />
          <DetailField
            label="Paid at"
            value={formatPaymentDateTime(payment.paidAt)}
          />
          <DetailField
            label="Amount"
            value={formatRsAmount(payment.amount, currency)}
          />
          <DetailField label="Fee" value={formatRsAmount(payment.fee ?? null, currency)} />
          <DetailField
            label="Gateway fee tax"
            value={formatRsAmount(
              payment.gatewayFeeTaxAmount ?? payment.tax ?? null,
              currency,
            )}
          />
          {effectiveGoodsGst != null && effectiveGoodsGst > 0 ? (
            <DetailField
              label="GST (18%)"
              value={formatRsAmount(effectiveGoodsGst, currency)}
            />
          ) : null}
          <DetailField
            label="Order ID"
            value={payment.razorpayOrderId ?? "—"}
          />
          <DetailField
            label="Payment ID"
            value={payment.razorpayPaymentId ?? "—"}
          />
          <DetailField label="Payer email" value={payment.email ?? "—"} />
          <DetailField label="Payer contact" value={payment.contact ?? "—"} />
        </DetailFieldsGrid>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Method & gateway details
          </div>
          <DetailFieldsGrid columns={3}>
            {methodFields.map((field) => (
              <DetailField
                key={`${field.label}-${field.value}`}
                label={field.label}
                value={field.value}
              />
            ))}
          </DetailFieldsGrid>
        </div>
      </div>
    </div>
  );
}
