import { describe, it, expect } from "vitest";

import { addLevelSchema } from "@/app/admin/profile/_components/LevelManagement";

/**
 * Only the first failure is shown, so these assert the message the user
 * actually sees — the order is behaviour, not an implementation detail.
 */
const firstError = (input: Record<string, unknown>): string | null => {
  const result = addLevelSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

const valid = {
  name: "Level 1",
  code: "L1",
  streamId: 3,
  totalMarks: 100,
  passMark: 40,
  durationInMonths: 3,
};

describe("add-level rules", () => {
  it("accepts a well-formed level", () => {
    expect(firstError(valid)).toBeNull();
  });

  it("requires name and code before anything else", () => {
    expect(firstError({ ...valid, name: "  ", streamId: 0 })).toBe(
      "Name and code are required",
    );
    expect(firstError({ ...valid, code: "" })).toBe(
      "Name and code are required",
    );
  });

  it("requires a stream", () => {
    expect(firstError({ ...valid, streamId: 0 })).toBe(
      "Select a stream (create one in Streams & transitions first)",
    );
  });

  it("requires positive total marks", () => {
    expect(firstError({ ...valid, totalMarks: 0 })).toBe(
      "Total marks must be greater than 0",
    );
    expect(firstError({ ...valid, totalMarks: null })).toBe(
      "Total marks must be greater than 0",
    );
  });

  it("requires the pass mark to sit within the total", () => {
    expect(firstError({ ...valid, passMark: 0 })).toBe(
      "Pass mark must be between 1 and total marks",
    );
    expect(firstError({ ...valid, totalMarks: 50, passMark: 51 })).toBe(
      "Pass mark must be between 1 and total marks",
    );
  });

  it("accepts a pass mark equal to the total", () => {
    expect(firstError({ ...valid, totalMarks: 50, passMark: 50 })).toBeNull();
  });

  it("requires at least one month of duration", () => {
    expect(firstError({ ...valid, durationInMonths: 0 })).toBe(
      "Duration must be at least 1 month",
    );
  });

  it("reports the total-marks problem before the pass-mark one", () => {
    expect(firstError({ ...valid, totalMarks: 0, passMark: 99 })).toBe(
      "Total marks must be greater than 0",
    );
  });
});
