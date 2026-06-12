/**
 * Offline payment modes shared between the setup form (step-agreement.tsx)
 * and the RecordReceivablePaymentDialog.
 *
 * Note: "razorpay" is intentionally excluded here — it is an online gateway
 * mode used only in the franchise-setup form, not a valid offline recording
 * mode for admin receivable items.
 */
export const PAYMENT_MODES = [
  "cash",
  "upi",
  "bank-transfer",
  "cheque",
  "other",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

/** Human-readable labels for each offline payment mode. */
export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  "bank-transfer": "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
};
