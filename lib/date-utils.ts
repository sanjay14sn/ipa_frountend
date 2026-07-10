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
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }); // → "15 Jan 2025, 10:30 am"
}

/**
 * Formats a date to a short human-readable string in `D Mon YYYY` style
 * (e.g. "12 Jun 2026") — numeric day (no leading zero).
 *
 * Returns "-" for falsy / unparseable input.
 */
function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a date to a compact uppercase timeline label in `D MON` style
 * (e.g. "12 JUN") — intended for narrow timeline display.
 *
 * Returns "-" for falsy / unparseable input.
 */
export function formatTimelineDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    .toUpperCase();
}

/**
 * Formats a date to a month-year label (e.g. "Jun 2026") — for "member
 * since"-style durations where the day is noise.
 *
 * Returns null for falsy / unparseable input (callers typically hide the
 * label entirely).
 */
export function formatMonthYear(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
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

/**
 * Relative "Updated Xm ago" formatter for dashboard headers (R5). Returns
 * "just now" under a minute, then Xm/Xh/Xd ago. Accepts a timestamp, ISO
 * string, or Date; falsy/unparseable input reads as "just now".
 */
export function formatLastUpdated(value?: string | number | Date): string {
  if (!value) return "just now";
  const time =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : new Date(value).getTime();
  const diffMs = Date.now() - time;
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "just now";
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
