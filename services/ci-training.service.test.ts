import { describe, it, expect } from "vitest";
import { normalizeCIProgressResponse } from "./ci-training.service";

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

  it("treats a completed training as COMPLETED even with a stale open assignment", () => {
    // Admin force-completion used to leave the session assignment ASSIGNED,
    // making the CI portal render the level as incomplete forever.
    const [row] = normalizeCIProgressResponse({
      trainings: [
        {
          id: 18,
          trainingLevelId: 3,
          trainingLevel: { id: 3, name: "Level 3", code: "CL3", displayOrder: 3 },
          displayOrder: 3,
          paid: true,
          isCompleted: true,
          isActive: false,
          marks: 80,
          assignment: {
            status: "ASSIGNED",
            sessionId: 42,
            theoryMarks: null,
            practicalMarks: null,
            completedAt: null,
          },
        },
      ],
      purchases: [],
    });
    expect(row.status).toBe("COMPLETED");
    expect(row.isCompleted).toBe(true);
  });
});
