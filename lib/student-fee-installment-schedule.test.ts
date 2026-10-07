import { describe, expect, it } from "vitest";

import { buildStudentFeeHistoryFromConfig } from "@/lib/student-fee-history.utils";
import type { StudentFeeConfigurationResponse } from "@/services/student-fee.service";

function baseConfig(
  overrides: Partial<StudentFeeConfigurationResponse> = {},
): StudentFeeConfigurationResponse {
  return {
    id: 1,
    studentId: 1,
    franchiseId: "f1",
    feeRule: "REG_ONLY",
    registrationFee: 1000,
    courseFee: 6000,
    totalPayable: 1000,
    monthlyFee: 1500,
    startDate: "2026-10-07",
    endDate: "2027-02-07",
    isManualEndDate: false,
    durationOption: "level",
    durationMonths: 4,
    sessionsOption: "4",
    sessionsPerMonth: 4,
    installmentDays: 30,
    nextDueDate: null,
    nextDueAmount: 0,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("fee installment schedule (REG_ONLY)", () => {
  it("builds registration plus durationMonths monthly installments", () => {
    const history = buildStudentFeeHistoryFromConfig(
      { id: 1, name: "Test", rollNo: "R1" },
      baseConfig({ nextDueDate: "2027-03-06", nextDueAmount: 1500 }),
    );

    expect(history.rows).toHaveLength(5);
    const sum = history.rows.reduce((s, r) => s + r.amount, 0);
    expect(sum).toBe(7000);
  });
});
