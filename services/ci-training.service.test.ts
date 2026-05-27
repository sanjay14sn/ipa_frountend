import { describe, it, expect } from "vitest";
import {
  buildCITrainingPurchasePayload,
  normalizeCIProgressResponse,
} from "./ci-training.service";

describe("buildCITrainingPurchasePayload", () => {
  it("wraps a single id in an array", () => {
    expect(buildCITrainingPurchasePayload(12)).toEqual({ packageIds: [12] });
  });

  it("passes through an array unchanged", () => {
    expect(buildCITrainingPurchasePayload([12, 13])).toEqual({
      packageIds: [12, 13],
    });
  });
});

describe("normalizeCIProgressResponse", () => {
  const progress = normalizeCIProgressResponse({
    trainings: [
      {
        id: 16,
        trainingLevelId: 1,
        trainingLevel: { id: 1, name: "Level 1", code: "CL1", displayOrder: 1 },
        displayOrder: 1,
        paid: true,
        isCompleted: false,
        isActive: true,
        marks: null,
        assignment: {
          status: "WAITING",
          sessionId: null,
          theoryMarks: null,
          practicalMarks: null,
          completedAt: null,
        },
      },
      {
        id: 17,
        trainingLevelId: 2,
        trainingLevel: { id: 2, name: "Level 2", code: "CL2", displayOrder: 2 },
        displayOrder: 2,
        paid: true,
        isCompleted: false,
        isActive: false,
        marks: null,
        assignment: null,
      },
    ],
    purchases: [],
  });

  it("normalizes two training rows", () => {
    expect(progress).toHaveLength(2);
  });

  it("maps first training level name and status", () => {
    expect(progress[0].trainingLevelName).toBe("Level 1");
    expect(progress[0].status).toBe("WAITING");
    expect(progress[0].paid).toBe(true);
    expect(progress[0].isActive).toBe(true);
  });

  it("defaults inactive training without assignment to PAID", () => {
    expect(progress[1].trainingLevelName).toBe("Level 2");
    expect(progress[1].status).toBe("PAID");
  });
});
