import { describe, expect, it } from "vitest";

import {
  normalizeStudentBulkImportRow,
  normalizeStudentImportDate,
  normalizeStudentImportSex,
  normalizeStudentImportStandard,
} from "./student-bulk-import-normalization";

describe("student bulk import normalization", () => {
  it("normalizes dd-mm-yyyy student import dates to ISO strings", () => {
    expect(normalizeStudentImportDate("21-01-2014")).toBe("2014-01-21");
    expect(normalizeStudentImportDate("01-02-2023")).toBe("2023-02-01");
    expect(normalizeStudentImportDate("25/02/2026")).toBe("2026-02-25");
  });

  it("leaves canonical ISO dates unchanged", () => {
    expect(normalizeStudentImportDate("2014-03-15")).toBe("2014-03-15");
  });

  it("normalizes CSV sex abbreviations to the student form values", () => {
    expect(normalizeStudentImportSex("M")).toBe("Male");
    expect(normalizeStudentImportSex("f")).toBe("Female");
    expect(normalizeStudentImportSex("Female")).toBe("Female");
  });

  it("normalizes standard variants to the student form dropdown values", () => {
    expect(normalizeStudentImportStandard("Class 2")).toBe("2nd");
    expect(normalizeStudentImportStandard("2ND")).toBe("2nd");
    expect(normalizeStudentImportStandard("7TH")).toBe("7th");
    expect(normalizeStudentImportStandard("Class 4")).toBe("4th");
    expect(normalizeStudentImportStandard("pre kg")).toBe("Pre-KG");
  });

  it("builds a commit-ready patch for raw CSV row data", () => {
    expect(
      normalizeStudentBulkImportRow({
        sex: "M",
        dateOfBirth: "21-01-2014",
        dateOfJoining: "01-02-2023",
        previousCompletedAt: "25-02-2026",
        standard: "Class 2",
      }),
    ).toEqual({
      sex: "Male",
      dateOfBirth: "2014-01-21",
      dateOfJoining: "2023-02-01",
      previousCompletedAt: "2026-02-25",
      standard: "2nd",
    });
  });

  it("returns null when a row is already canonical", () => {
    expect(
      normalizeStudentBulkImportRow({
        sex: "Female",
        dateOfBirth: "2014-03-15",
        dateOfJoining: "2026-06-01",
        previousCompletedAt: "2025-12-15",
        standard: "4th",
      }),
    ).toBeNull();
  });
});
