/**
 * lib/date-utils.ts — Shared date formatting and calculation utilities.
 *
 * All locale-sensitive output uses "en-IN" (India). Each function is null-safe:
 * passing `null`, `undefined`, or an invalid date string returns a safe fallback
 * ("-", "N/A", or 0) rather than throwing.
 *
 * Migration guide for inline copies:
 *   - Any `toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })`
 *     → `formatDate(value)`
 *   - Any `toLocaleString("en-IN")` for full date+time → `formatDateTime(value)`
 *   - Any inline age-from-DOB calculation → `calculateAge(dateOfBirth)`
 *   - `fmtDate` is an alias for `formatDate` kept for legacy callers.
 */

/**
 * Formats a date string (ISO 8601 or any `new Date()`-parseable format) to a
 * human-readable date in `DD Mon YYYY` style (e.g. "15 Jan 2025").
 *
 * Returns "-" for falsy / unparseable input.
 */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Alias for {@link formatDate} — kept for legacy callers. */
export const fmtDate = formatDate;

/**
 * Formats a date string to a human-readable date + time in locale format
 * (e.g. "15/01/2025, 10:30:00 am").
 *
 * Returns "N/A" for falsy / unparseable input.
 */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN");
}

/**
 * Calculates age in full years from a date-of-birth string.
 *
 * Returns 0 for falsy / unparseable input.
 */
export function calculateAge(dateOfBirth: string | Date | null | undefined): number {
  if (!dateOfBirth) return 0;
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}
