/**
 * lib/currency-utils.ts — Shared currency formatting utilities.
 *
 * All formatting uses "en-IN" locale (India) with INR as the default currency.
 * Null-safe: falsy or NaN inputs return "N/A" rather than throwing.
 *
 * Migration guide for inline copies:
 *   - `new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", ... }).format(v)`
 *     → `formatRupees(v)`
 *   - `formatInr`, `fmtMoney`, `formatRsAmount` are deprecated aliases kept for
 *     a one-cycle migration window — migrate callers to `formatRupees`.
 */

/** Shared formatter instance — created once and reused for performance. */
const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric amount as an Indian Rupee string (e.g. "₹1,23,456.00").
 *
 * Returns "N/A" for `null`, `undefined`, or `NaN` input.
 */
export function formatRupees(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  try {
    return INR_FORMATTER.format(Number(value));
  } catch {
    return `Rs. ${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * @deprecated Use {@link formatRupees} instead.
 * Alias kept for compatibility with `lib/gst.ts` and legacy callers.
 */
export const formatInr = formatRupees;

/**
 * @deprecated Use {@link formatRupees} instead.
 */
export const fmtMoney = formatRupees;

/**
 * @deprecated Use {@link formatRupees} instead.
 */
export const formatRsAmount = formatRupees;
