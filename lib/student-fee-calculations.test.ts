import { describe, expect, it } from "vitest";
import {
  addMonthsToDate,
  computeFeeTotals,
  computeMonthlyFee,
  parseFeeAmount,
  resolveLevelDurationMonths,
} from "./student-fee-calculations";

describe("parseFeeAmount", () => {
  it("parses numeric strings safely", () => {
    expect(parseFeeAmount("1000")).toBe(1000);
    expect(parseFeeAmount("6000.50")).toBe(6000.5);
  });

  it("returns 0 for invalid values", () => {
    expect(parseFeeAmount("")).toBe(0);
    expect(parseFeeAmount(undefined)).toBe(0);
    expect(parseFeeAmount(-5)).toBe(0);
  });
});

describe("computeFeeTotals", () => {
  const base = {
    registrationFee: 1000,
    courseFee: 6000,
    durationMonths: 4,
  };

  it("REG_PLUS_FULL_COURSE = registration + full course", () => {
    const result = computeFeeTotals({
      ...base,
      feeRule: "REG_PLUS_FULL_COURSE",
    });
    expect(result.totalPayable).toBe(7000);
    expect(result.monthlyFee).toBe(1500);
  });

  it("REG_PLUS_FIRST_MONTH = registration + monthly share", () => {
    const result = computeFeeTotals({
      ...base,
      feeRule: "REG_PLUS_FIRST_MONTH",
    });
    expect(result.totalPayable).toBe(2500);
    expect(result.monthlyFee).toBe(1500);
  });

  it("REG_ONLY = registration only due now", () => {
    const result = computeFeeTotals({
      ...base,
      feeRule: "REG_ONLY",
    });
    expect(result.totalPayable).toBe(1000);
    expect(result.monthlyFee).toBe(1500);
  });

  it("handles string amounts from API without string concatenation", () => {
    const result = computeFeeTotals({
      feeRule: "REG_PLUS_FULL_COURSE",
      registrationFee: "1000",
      courseFee: "6000",
      durationMonths: 4,
    });
    expect(result.totalPayable).toBe(7000);
  });
});

describe("computeMonthlyFee", () => {
  it("divides course fee by duration months", () => {
    expect(computeMonthlyFee(6000, 4)).toBe(1500);
    expect(computeMonthlyFee(6000, 0)).toBe(6000);
  });
});

describe("addMonthsToDate", () => {
  it("adds months preserving day when possible", () => {
    expect(addMonthsToDate("2026-08-20", 4)).toBe("2026-12-20");
  });

  it("clamps to last day of target month", () => {
    expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("resolveLevelDurationMonths", () => {
  it("reads durationInMonths from level object", () => {
    expect(resolveLevelDurationMonths({ durationInMonths: 4 })).toBe(4);
  });

  it("falls back to 3 when missing", () => {
    expect(resolveLevelDurationMonths(null)).toBe(3);
  });
});
