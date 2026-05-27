/**
 * lib/currency-utils.test.ts — Unit tests for currency formatting utilities.
 *
 * Run with: pnpm test lib/currency-utils.test.ts
 */

import { describe, it, expect } from "vitest";
import { formatRupees, formatInr, fmtMoney, formatRsAmount } from "./currency-utils";

describe("formatRupees", () => {
  it("returns 'N/A' for null", () => {
    expect(formatRupees(null)).toBe("N/A");
  });

  it("returns 'N/A' for undefined", () => {
    expect(formatRupees(undefined)).toBe("N/A");
  });

  it("returns 'N/A' for NaN", () => {
    expect(formatRupees(NaN)).toBe("N/A");
  });

  it("formats zero as ₹0.00", () => {
    const result = formatRupees(0);
    expect(result).toContain("0.00");
  });

  it("formats a positive number with INR symbol", () => {
    const result = formatRupees(1234.5);
    expect(result).toContain("1,234.50");
  });

  it("formats a large number with Indian grouping", () => {
    const result = formatRupees(123456);
    // Indian number format: 1,23,456.00
    expect(result).toContain("23,456");
  });

  it("deprecated aliases return the same value", () => {
    expect(formatInr(1000)).toBe(formatRupees(1000));
    expect(fmtMoney(1000)).toBe(formatRupees(1000));
    expect(formatRsAmount(1000)).toBe(formatRupees(1000));
  });

  it("handles negative numbers", () => {
    const result = formatRupees(-500);
    expect(result).toContain("500.00");
  });
});
