/**
 * lib/currency-utils.ts — Shared currency formatting utilities.
 *
 * All formatting uses "en-IN" locale (India) with INR as the default currency.
 * Null-safe: falsy or NaN inputs return "N/A" rather than throwing.
 *
 * Migration guide for inline copies:
 *   - `new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", ... }).format(v)`
 *     → `formatRupees(v)`
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
/** The currency glyph — kit/app code interpolates this instead of a ₹
 * literal (the Phase-9 lint bans raw ₹ outside this module). */
export const RUPEE_SYMBOL = "₹";

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
 * Fee-surface variant of {@link formatRupees}: a zero amount renders as
 * "Free" so a no-cost fee reads as intentionally free rather than "₹0.00".
 * Null/undefined/NaN still return "N/A" (unknown, not free).
 */
export function formatRupeesOrFree(value?: number | null): string {
  if (value != null && Number(value) === 0) return "Free";
  return formatRupees(value);
}

/**
 * Formats an amount in an arbitrary ISO currency (en-IN locale). Prefer
 * {@link formatRupees} — this exists only for surfaces that carry a dynamic
 * currency code (e.g. gateway payments).
 */
export function formatCurrencyAmount(
  value?: number | null,
  currency = "INR",
): string {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  if (currency === "INR") return formatRupees(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
