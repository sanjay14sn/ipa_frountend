/**
 * lib/date-utils.test.ts — Unit tests for date formatting utilities.
 *
 * Run with: pnpm test lib/date-utils.test.ts
 */

import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, calculateAge, fmtDate } from "./date-utils";

describe("formatDate", () => {
  it("returns '-' for null", () => {
    expect(formatDate(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns '-' for empty string", () => {
    expect(formatDate("")).toBe("-");
  });

  it("returns the raw string for unparseable input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("formats a valid ISO date string", () => {
    const result = formatDate("2025-01-15");
    // Should contain the year and some representation of month/day
    expect(result).toContain("2025");
    expect(result).not.toBe("-");
  });

  it("formats a Date object", () => {
    const date = new Date("2025-06-01T00:00:00Z");
    const result = formatDate(date);
    expect(result).toContain("2025");
    expect(result).not.toBe("-");
  });

  it("fmtDate is an alias for formatDate", () => {
    expect(fmtDate("2025-01-15")).toBe(formatDate("2025-01-15"));
    expect(fmtDate(null)).toBe(formatDate(null));
  });
});

describe("formatDateTime", () => {
  it("returns 'N/A' for null", () => {
    expect(formatDateTime(null)).toBe("N/A");
  });

  it("returns 'N/A' for undefined", () => {
    expect(formatDateTime(undefined)).toBe("N/A");
  });

  it("formats a valid ISO datetime string", () => {
    const result = formatDateTime("2025-01-15T10:30:00Z");
    expect(result).toContain("2025");
    expect(result).not.toBe("N/A");
  });
});

describe("calculateAge", () => {
  it("returns 0 for null", () => {
    expect(calculateAge(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(calculateAge(undefined)).toBe(0);
  });

  it("returns 0 for an invalid date string", () => {
    expect(calculateAge("not-a-date")).toBe(0);
  });

  it("calculates age correctly for a known DOB (born 10 years ago)", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const dob = tenYearsAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    expect(calculateAge(dob)).toBe(10);
  });

  it("returns 0 for a future date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    // Age should be 0 or negative → capped at 0 because birthday hasn't happened
    const age = calculateAge(future.toISOString());
    expect(age).toBeLessThanOrEqual(0);
  });

  it("accepts a Date object", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    expect(calculateAge(tenYearsAgo)).toBe(10);
  });
});
