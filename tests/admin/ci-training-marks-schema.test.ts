import { describe, it, expect } from "vitest";

import { marksSchema } from "@/app/admin/course-instructors/_components/ci-training/CITrainingSessionsTab";

/**
 * Theory marks used to be guarded only by the browser (`required`, `min=0`)
 * and then handed straight to Number(), so a blank or non-numeric value became
 * NaN in the request body. Practical is genuinely optional — blank means "not
 * recorded" and must stay accepted.
 */
const parse = (theoryMarks: string, practicalMarks = "") =>
  marksSchema.safeParse({ theoryMarks, practicalMarks });

describe("CI training marks", () => {
  it("accepts a whole number for theory", () => {
    expect(parse("72").success).toBe(true);
  });

  it("accepts zero", () => {
    expect(parse("0").success).toBe(true);
  });

  it("rejects a blank theory mark rather than sending NaN", () => {
    const result = parse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Theory marks must be a number");
    }
  });

  it("rejects a non-numeric theory mark", () => {
    expect(parse("abc").success).toBe(false);
  });

  it("rejects a negative theory mark", () => {
    const result = parse("-1");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Theory marks cannot be negative");
    }
  });

  it("treats a blank practical mark as not recorded", () => {
    expect(parse("50", "").success).toBe(true);
  });

  it("still validates a practical mark when one is given", () => {
    expect(parse("50", "abc").success).toBe(false);
    expect(parse("50", "-3").success).toBe(false);
    expect(parse("50", "40").success).toBe(true);
  });
});
