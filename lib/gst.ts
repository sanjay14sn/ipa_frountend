export const GST_RATE = 0.18;
export const GST_RATE_LABEL = "18% GST";

export interface FranchiseFeePayable {
  base: number;
  gst: number;
  payable: number;
  inclusive: boolean;
}

/**
 * Mirrors the backend `applyGstToFranchiseFee` helper. When the franchise fee
 * is marked as GST-inclusive the displayed amount equals the base; otherwise
 * an 18% surcharge is applied. The same helper is used for the lump-sum
 * franchise fee and for each receivable item (down payment + monthly
 * installments), which are slices of the franchise fee and inherit its GST
 * treatment.
 */
export function getFranchiseFeePayable(
  amount: number | string | null | undefined,
  gstInclusive: boolean | null | undefined,
): FranchiseFeePayable {
  const base = Number(amount) || 0;
  const inclusive = gstInclusive === true;
  if (inclusive) {
    return { base, gst: 0, payable: base, inclusive: true };
  }
  const gst = roundPaise(base * GST_RATE);
  const payable = roundPaise(base + gst);
  return { base, gst, payable, inclusive: false };
}

export function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function roundPaise(value: number): number {
  return Math.round(value * 100) / 100;
}
