import { describe, expect, it } from "vitest";
import {
  createDefaultSection,
  estimateSectionUniqueCapacity,
  hasProvenInsufficientCapacity,
  normalizeSectionRules,
  repairSectionForGeneration,
  syncModelSnapshot,
} from "./paper-section-rules.utils";

describe("syncModelSnapshot", () => {
  it("mirrors operation and digit position fields into model snapshots", () => {
    const base = createDefaultSection("C", 0);
    const patched = {
      ...base,
      operationPattern: "random" as const,
      digitPositionPattern: "random" as const,
      customOperationPattern: "+ - +",
      fixedDigitPositions: [1, 2, 1, 1],
      customDigitPositions: [2, 1, 1, 1],
    };

    const synced = syncModelSnapshot(patched);

    expect(synced.modelOperationPattern).toBe("random");
    expect(synced.modelDigitPositionPattern).toBe("random");
    expect(synced.modelCustomOperationPattern).toBe("+ - +");
    expect(synced.modelFixedDigitPositions).toEqual([1, 2, 1, 1]);
    expect(synced.customDigitPositions).toEqual([2, 1, 1, 1]);
    expect(synced.opPattern).toBe("Random");
  });

  it("defaults Section C to random digit position and random operation pattern", () => {
    const section = createDefaultSection("C", 0);
    expect(section.digitPositionPattern).toBe("random");
    expect(section.operationPattern).toBe("random");
  });
});

describe("estimateSectionUniqueCapacity", () => {
  it("does not report zero capacity for mixed 4x1D + 4x2D with zeroed saved ranges", () => {
    const section = normalizeSectionRules({
      id: "mixed-b",
      name: "BlockB",
      type: "Mental/Zhusuan",
      questions: 25,
      rows: 8,
      modelQuestions: 25,
      modelRows: 8,
      time: "1.25",
      modelTime: "1.25",
      ops: ["+", "-"],
      ruleSource: "model",
      digitComposition: {
        mode: "mixed",
        groups: [
          { digits: 1, count: 4, min: 0, max: 0 },
          { digits: 2, count: 4, min: 0, max: 0 },
        ],
      },
      digitPositionPattern: "random",
      operationPattern: "random",
    });

    const capacity = estimateSectionUniqueCapacity(section);
    expect(capacity.maxUnique).not.toBe(0);
    expect(hasProvenInsufficientCapacity(capacity, 25)).toBe(false);
  });

  it("estimates large capacity for fixed mixed 4x1D + 4x2D composition", () => {
    const section = normalizeSectionRules({
      id: "mixed-b",
      name: "BlockB",
      type: "Mental/Zhusuan",
      questions: 25,
      rows: 8,
      modelQuestions: 25,
      modelRows: 8,
      time: "1.25",
      modelTime: "1.25",
      ops: ["+", "-"],
      ruleSource: "model",
      digitComposition: {
        mode: "mixed",
        groups: [
          { digits: 1, count: 4, min: 1, max: 9 },
          { digits: 2, count: 4, min: 10, max: 99 },
        ],
      },
      digitPositionPattern: "model",
      operationPattern: "random",
    });

    const capacity = estimateSectionUniqueCapacity(section);
    expect(capacity.maxUnique).not.toBeNull();
    expect(capacity.maxUnique!).toBeGreaterThanOrEqual(25);
    expect(hasProvenInsufficientCapacity(capacity, 25)).toBe(false);
  });
});

describe("repairSectionForGeneration", () => {
  it("does not replace arbitrary section names with A/B/C/D templates", () => {
    const section = normalizeSectionRules({
      id: "x1",
      name: "CustomAlpha",
      type: "Mental/Zhusuan",
      questions: 25,
      rows: 4,
      modelQuestions: 25,
      modelRows: 4,
      time: "1.25",
      modelTime: "1.25",
      ops: ["+", "-"],
      ruleSource: "model",
      digitComposition: {
        mode: "model",
        patternSelection: "model",
        patterns: [
          {
            id: "pattern-1",
            name: "Pattern 1",
            groups: [
              { digits: 1, count: 3, min: 1, max: 9 },
              { digits: 2, count: 1, min: 10, max: 99 },
            ],
          },
        ],
      },
      digitPositionPattern: "random",
      operationPattern: "random",
    });

    const repaired = repairSectionForGeneration(section);

    expect(repaired.name).toBe("CustomAlpha");
    expect(repaired.digitPositionPattern).toBe("random");
    expect(repaired.operationPattern).toBe("random");
    expect(repaired.digitComposition?.mode).toBe("model");
    expect(repaired.digitComposition?.patterns?.[0]?.groups?.filter((g) => g.count > 0)).toEqual([
      { digits: 1, count: 3, min: 1, max: 9 },
      { digits: 2, count: 1, min: 10, max: 99 },
    ]);
  });
});
