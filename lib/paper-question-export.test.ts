import { describe, expect, it } from "vitest";
import {
  buildQuestionExportCsv,
  collectQuestionsFromPaper,
  formatQuestionExpression,
} from "./paper-question-export";
import type { QuestionPaperTree } from "./paper-section-utils";

describe("paper-question-export", () => {
  it("formats mental rows as a readable expression", () => {
    expect(formatQuestionExpression(["5", "+3", "-2"])).toBe("5 +3 -2");
  });

  it("builds csv for an entire question paper", () => {
    const tree: QuestionPaperTree = {
      "Question Paper 5": {
        "Section A": [
          { qNo: 1, rows: ["2", "+4", "+8"], answer: 14 },
          { qNo: 2, rows: ["9"], answer: 9 },
        ],
        "Section B": [{ qNo: 1, rows: ["12", "-3"], answer: 9 }],
      },
    };

    const rows = collectQuestionsFromPaper(tree, "Question Paper 5");
    expect(rows).toHaveLength(3);
    expect(rows[0].section).toBe("Section A");

    const csv = buildQuestionExportCsv(rows);
    expect(csv).toContain("Question Paper,Section,Q No,Question,Answer,Rows");
    expect(csv).toContain("Question Paper 5,Section A,1,2 +4 +8,14,2|+4|+8");
    expect(csv).toContain("Question Paper 5,Section B,1,12 -3,9,12|-3");
  });
});
