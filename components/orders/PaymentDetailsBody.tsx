"use client";

import { formatCurrencyAmount } from "@/lib/currency-utils";
import { Badge } from "@/components/ui/badge";
import { LabeledValue, StatusBadge } from "@/components/shared";
import {
  formatPaymentDateTime,
  getMethodSpecificFields,
  methodBadgeClass,
  methodLabel,
  typeBadgeClass,
  typeLabel,
} from "@/lib/payment-details-display";

export interface PaymentBodyData {
  status: string;
  method?: string | null;
  /** Callers normalize: pass `paidAt` or `createdAt` here. */
  date?: string | null;
  amount: number;
  currency?: string | null;
  fee?: number | null;
  gatewayFeeTaxAmount?: number | null;
  tax?: number | null;
  goodsGstAmount?: number | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  email?: string | null;
  contact?: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
}

interface PaymentDetailsBodyProps {
  payment: PaymentBodyData;
  /** When provided, renders a Franchise / Franchisee / Type row above amounts. */
  franchiseName?: string;
  franchiseeName?: string;
  /** The CI a training-fee payment was for. */
  courseInstructorName?: string;
  paymentType?: string;
  /**
   * Fallback for `payment.goodsGstAmount` on legacy rows created before the
   * GST split. Callers with access to the linked order should pass
   * `order.gstAmount` so the "GST (18%)" line still appears.
   */
  fallbackGoodsGstAmount?: number | string | null;
}

export function PaymentDetailsBody({
  payment,
  franchiseName,
  franchiseeName,
  courseInstructorName,
  paymentType,
  fallbackGoodsGstAmount = null,
}: PaymentDetailsBodyProps) {
  const currency = payment.currency ?? "INR";
  const methodFields = getMethodSpecificFields(payment);
  const effectiveGoodsGst =
    payment.goodsGstAmount != null
      ? Number(payment.goodsGstAmount)
      : fallbackGoodsGstAmount != null
        ? Number(fallbackGoodsGstAmount)
        : null;
  const hasContext = !!(
    franchiseName ||
    franchiseeName ||
    courseInstructorName ||
    paymentType
  );

  return (
    <div className="space-y-5">
      {/* Status / method / date */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={payment.status} />
        {payment.method ? (
          <Badge
            variant="outline"
            className={methodBadgeClass(payment.method)}
          >
            {methodLabel(payment.method)}
          </Badge>
        ) : null}
        {payment.date ? (
          <span className="text-sm text-muted-foreground">
            {formatPaymentDateTime(payment.date)}
          </span>
        ) : null}
      </div>

      {/* Franchise / franchisee / type (dialog only) */}
      {hasContext ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {franchiseName ? (
            <LabeledValue label="Franchise" value={franchiseName} />
          ) : null}
          {franchiseeName ? (
            <LabeledValue label="Franchisee" value={franchiseeName} />
          ) : null}
          {courseInstructorName ? (
            <LabeledValue
              label="Course Instructor"
              value={courseInstructorName}
            />
          ) : null}
          {paymentType ? (
            <LabeledValue
              label="Type"
              value={
                <Badge variant="outline" className={typeBadgeClass(paymentType)}>
                  {typeLabel(paymentType)}
                </Badge>
              }
            />
          ) : null}
        </div>
      ) : null}

      {/* Amounts */}
      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3${hasContext ? " border-t pt-4" : ""}`}
      >
        <LabeledValue
          label="Amount"
          value={formatCurrencyAmount(payment.amount, currency)}
        />
        {payment.fee != null ? (
          <LabeledValue
            label="Fee"
            value={formatCurrencyAmount(payment.fee, currency)}
          />
        ) : null}
        {(payment.gatewayFeeTaxAmount ?? payment.tax) != null ? (
          <LabeledValue
            label="Gateway fee tax"
            value={formatCurrencyAmount(
              payment.gatewayFeeTaxAmount ?? payment.tax,
              currency,
            )}
          />
        ) : null}
        {effectiveGoodsGst != null && effectiveGoodsGst > 0 ? (
          <LabeledValue
            label="GST (18%)"
            value={formatCurrencyAmount(effectiveGoodsGst, currency)}
          />
        ) : null}
      </div>

      {/* Identifiers */}
      {payment.razorpayOrderId ||
      payment.razorpayPaymentId ||
      payment.email ||
      payment.contact ? (
        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          {payment.razorpayOrderId ? (
            <LabeledValue
              label="Order ID"
              value={payment.razorpayOrderId}
              mono
            />
          ) : null}
          {payment.razorpayPaymentId ? (
            <LabeledValue
              label="Payment ID"
              value={payment.razorpayPaymentId}
              mono
            />
          ) : null}
          {payment.email ? (
            <LabeledValue label="Payer email" value={payment.email} />
          ) : null}
          {payment.contact ? (
            <LabeledValue label="Payer contact" value={payment.contact} />
          ) : null}
        </div>
      ) : null}

      {/* Method & gateway details */}
      {methodFields.length > 0 ? (
        <div className="border-t pt-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Method &amp; gateway details
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {methodFields.map((field) => (
              <LabeledValue
                key={`${field.label}-${field.value}`}
                label={field.label}
                value={field.value}
              />
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
}
