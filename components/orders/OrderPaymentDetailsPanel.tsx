"use client";

import type { PaymentSummary } from "@/services/order-admin.service";
import { PaymentDetailsBody, type PaymentBodyData } from "./PaymentDetailsBody";

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
  const body: PaymentBodyData = { ...payment, date: payment.paidAt };

  return (
    <div
      className={`rounded-xl border border-border/70 bg-muted/30 p-4 ${className}`.trim()}
    >
      {!hideTitle ? (
        <div className="mb-4 text-sm font-semibold text-card-foreground">
          Payment details
        </div>
      ) : null}
      <PaymentDetailsBody
        payment={body}
        fallbackGoodsGstAmount={fallbackGoodsGstAmount}
      />
    </div>
  );
}
