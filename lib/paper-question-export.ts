import type { GeneratedQuestionLike, QuestionPaperTree } from "@/lib/paper-section-utils";

export type QuestionExportRow = {
  questionPaper: string;
  section: string;
  qNo: number;
  question: string;
  answer: number;
  rows: string;
  type?: string;
};

function escapeCsvField(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatQuestionExpression(rows: string[]): string {
  return rows
    .map((row, index) => {
      const trimmed = row.trim();
      if (!trimmed) return "";
      if (index === 0) return trimmed;
      if (trimmed.startsWith("+") || trimmed.startsWith("-")) return trimmed;
      return `+${trimmed}`;
    })
    .filter(Boolean)
    .join(" ");
}

export function collectQuestionsFromPaper(
  tree: QuestionPaperTree,
  questionPaperName: string,
): QuestionExportRow[] {
  const sections = tree[questionPaperName] ?? {};
  const rows: QuestionExportRow[] = [];

  for (const [sectionSetName, questions] of Object.entries(sections)) {
    questions.forEach((question, index) => {
      rows.push(mapQuestionToExportRow(question, questionPaperName, sectionSetName, index + 1));
    });
  }

  return rows.sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section, undefined, { numeric: true });
    return a.qNo - b.qNo;
  });
}

export function collectQuestionsFromSection(
  tree: QuestionPaperTree,
  questionPaperName: string,
  sectionSetName: string,
): QuestionExportRow[] {
  const questions = tree[questionPaperName]?.[sectionSetName] ?? [];
  return questions.map((question, index) =>
    mapQuestionToExportRow(question, questionPaperName, sectionSetName, index + 1),
  );
}

function mapQuestionToExportRow(
  question: GeneratedQuestionLike,
  questionPaperName: string,
  sectionSetName: string,
  qNo: number,
): QuestionExportRow {
  const section = sectionSetName.replace(/^Section\s+/i, "").trim();
  return {
    questionPaper: questionPaperName,
    section: sectionSetName.startsWith("Section ") ? sectionSetName : `Section ${section}`,
    qNo: question.qNo ?? qNo,
    question: formatQuestionExpression(question.rows),
    answer: question.answer,
    rows: question.rows.join("|"),
    type: (question as { type?: string }).type,
  };
}

export function buildQuestionExportCsv(rows: QuestionExportRow[]): string {
  const header = ["Question Paper", "Section", "Q No", "Question", "Answer", "Rows"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        escapeCsvField(row.questionPaper),
        escapeCsvField(row.section),
        escapeCsvField(row.qNo),
        escapeCsvField(row.question),
        escapeCsvField(row.answer),
        escapeCsvField(row.rows),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

export function buildQuestionExportJson(rows: QuestionExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function sanitizeDownloadFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "questions";
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadQuestionPaperCsv(
  tree: QuestionPaperTree,
  questionPaperName: string,
  filenamePrefix?: string,
): number {
  const rows = collectQuestionsFromPaper(tree, questionPaperName);
  if (!rows.length) return 0;

  const prefix = sanitizeDownloadFilename(filenamePrefix ?? questionPaperName);
  downloadTextFile(
    buildQuestionExportCsv(rows),
    `${prefix}.csv`,
    "text/csv;charset=utf-8",
  );
  return rows.length;
}

export function downloadQuestionSectionCsv(
  tree: QuestionPaperTree,
  questionPaperName: string,
  sectionSetName: string,
  filenamePrefix?: string,
): number {
  const rows = collectQuestionsFromSection(tree, questionPaperName, sectionSetName);
  if (!rows.length) return 0;

  const sectionLabel = sanitizeDownloadFilename(sectionSetName.replace(/^Section\s+/i, "Section-"));
  const prefix = sanitizeDownloadFilename(filenamePrefix ?? `${questionPaperName}_${sectionLabel}`);
  downloadTextFile(
    buildQuestionExportCsv(rows),
    `${prefix}.csv`,
    "text/csv;charset=utf-8",
  );
  return rows.length;
}

export function downloadAllQuestionPapersCsv(
  tree: QuestionPaperTree,
  filenamePrefix?: string,
): number {
  const rows = Object.keys(tree).flatMap((paperName) => collectQuestionsFromPaper(tree, paperName));
  if (!rows.length) return 0;

  const prefix = sanitizeDownloadFilename(filenamePrefix ?? "all-question-papers");
  downloadTextFile(
    buildQuestionExportCsv(rows),
    `${prefix}.csv`,
    "text/csv;charset=utf-8",
  );
  return rows.length;
}
