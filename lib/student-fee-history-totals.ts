import { isMonthlyInstallmentRow } from "@/lib/student-fee-history-display";
import type { StudentFeeHistoryRow } from "@/services/student-fee.service";

export interface StudentFeeHistoryTotals {
  planTotal: number;
  totalPaid: number;
  totalPending: number;
  paidInstallmentCount: number;
  pendingInstallmentCount: number;
  progressPercent: number;
}

export function computeStudentFeeHistoryTotals(
  rows: StudentFeeHistoryRow[],
  planTotal: number,
): StudentFeeHistoryTotals {
  const paidRows = rows.filter((row) => row.status === "PAID");
  const pendingRows = rows.filter((row) => row.status !== "PAID");
  const pendingMonthlies = pendingRows.filter(isMonthlyInstallmentRow);

  const totalPaid = roundMoney(
    paidRows.reduce((sum, row) => sum + Number(row.amount), 0),
  );
  const totalPending = roundMoney(
    pendingRows.reduce((sum, row) => sum + Number(row.amount), 0),
  );

  const safePlan = Math.max(0, roundMoney(planTotal));
  const progressPercent =
    safePlan > 0
      ? Math.min(100, Math.round((totalPaid / safePlan) * 100))
      : paidRows.length > 0
        ? 100
        : 0;

  return {
    planTotal: safePlan,
    totalPaid,
    totalPending,
    paidInstallmentCount: paidRows.filter(isMonthlyInstallmentRow).length,
    pendingInstallmentCount: pendingMonthlies.length,
    progressPercent,
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
