import { strict as assert } from "node:assert";
import { normalizeCIProgressResponse } from "./ci-training.service";

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

assert.equal(progress.length, 2);
assert.equal(progress[0].trainingLevelName, "Level 1");
assert.equal(progress[0].status, "WAITING");
assert.equal(progress[0].paid, true);
assert.equal(progress[0].isActive, true);
assert.equal(progress[1].trainingLevelName, "Level 2");
assert.equal(progress[1].status, "PAID");
