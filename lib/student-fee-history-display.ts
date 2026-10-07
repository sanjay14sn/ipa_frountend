import { formatDate, formatDateTime } from "@/lib/date-utils";
import type { StudentFeeHistoryRow } from "@/services/student-fee.service";

/** ISO timestamp for date-only rows (noon UTC avoids previous-day shifts). */
export function dueDateToPaidAtIso(dueDate: string): string {
  return `${dueDate.slice(0, 10)}T12:00:00.000Z`;
}

export function formatStudentFeePaidOn(row: StudentFeeHistoryRow): string {
  if (row.paidAt) {
    return formatDateTime(row.paidAt);
  }
  if (row.status === "PAID" && row.dueDate) {
    return formatDate(row.dueDate);
  }
  return "—";
}

/** Registration-only row — not numbered as a monthly installment. */
export function isRegistrationFeeRow(row: StudentFeeHistoryRow): boolean {
  const label = row.label.trim().toLowerCase();
  return label === "registration fee";
}

export function isCombinedFirstDueRow(row: StudentFeeHistoryRow): boolean {
  return row.label.trim().toLowerCase() === "registration + first month";
}

export function isMonthlyInstallmentRow(row: StudentFeeHistoryRow): boolean {
  return !isRegistrationFeeRow(row) && !isCombinedFirstDueRow(row);
}

export function formatFeeHistoryRowTitle(
  row: StudentFeeHistoryRow,
  allRows: StudentFeeHistoryRow[],
): string {
  if (isRegistrationFeeRow(row) || isCombinedFirstDueRow(row)) {
    return row.label;
  }

  const monthlyRows = allRows.filter(isMonthlyInstallmentRow);
  const monthlyIndex =
    monthlyRows.findIndex((item) => item.sequence === row.sequence) + 1;

  if (monthlyIndex > 0) {
    return `#${monthlyIndex} · ${row.label}`;
  }

  return row.label;
}

export function formatFeeCollectionSummary(
  rows: StudentFeeHistoryRow[],
): string {
  const registration = rows.find(isRegistrationFeeRow);
  const combinedFirst = rows.find(isCombinedFirstDueRow);
  const monthlies = rows.filter(isMonthlyInstallmentRow);
  const paidMonthlies = monthlies.filter((row) => row.status === "PAID").length;

  const parts: string[] = [];
  if (combinedFirst?.status === "PAID") {
    parts.push("Reg + 1st month paid");
  } else if (registration?.status === "PAID") {
    parts.push("Registration paid");
  }
  if (monthlies.length > 0) {
    parts.push(
      `${paidMonthlies} of ${monthlies.length} monthly installment${monthlies.length === 1 ? "" : "s"} cleared`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "No payments recorded";
}
