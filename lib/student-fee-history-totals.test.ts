import { describe, expect, it } from "vitest";

import { computeStudentFeeHistoryTotals } from "./student-fee-history-totals";

describe("computeStudentFeeHistoryTotals", () => {
  it("sums paid and pending from row status", () => {
    const totals = computeStudentFeeHistoryTotals(
      [
        {
          sequence: 1,
          label: "Registration",
          amount: 1000,
          dueDate: "2026-01-01",
          paidAt: "2026-01-01T12:00:00.000Z",
          status: "PAID",
        },
        {
          sequence: 2,
          label: "Monthly",
          amount: 500,
          dueDate: "2026-02-01",
          paidAt: null,
          status: "OVERDUE",
        },
      ],
      3500,
    );

    expect(totals.totalPaid).toBe(1000);
    expect(totals.totalPending).toBe(500);
    expect(totals.paidInstallmentCount).toBe(1);
    expect(totals.pendingInstallmentCount).toBe(1);
    expect(totals.progressPercent).toBe(29);
  });
});
