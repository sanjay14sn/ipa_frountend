import {
  cloneSectionsForNewQuestionPaper,
} from "@/lib/paper-section-rules.utils";
import type { PaperSectionRules } from "@/lib/paper-section-rules.types";

export type PaperSectionLike = {
  name: string;
  type?: "Mental/Zhusuan" | "Multiplication" | "Division";
  ruleSource?: "model" | "override";
  questions?: number;
  modelQuestions?: number;
  rows?: number;
  modelRows?: number;
};

export type QuestionPaperLike = {
  id: string;
  name: string;
  sections: PaperSectionLike[];
};

export type GeneratedQuestionLike = {
  qNo: number;
  rows: string[];
  answer: number;
  set?: string;
  sectionName?: string;
  sectionId?: string;
  questionPaperId?: string;
  questionPaperName?: string;
};

export type QuestionPaperTree = Record<string, Record<string, GeneratedQuestionLike[]>>;

/** Matches backend paper-rule-interpreter questionCount(). */
export function sectionQuestionCount(section: PaperSectionLike | undefined): number {
  if (!section) return 0;
  return section.ruleSource === "override"
    ? Number(section.questions) || 0
    : Number(section.modelQuestions) || Number(section.questions) || 0;
}

/** Matches backend paper-rule-interpreter rowsPerQuestion(). */
export function sectionRowsPerQuestion(section: PaperSectionLike | undefined): number {
  if (!section) return 0;
  if (section.type && section.type !== "Mental/Zhusuan") return 1;
  return section.ruleSource === "override"
    ? Number(section.rows) || Number(section.modelRows) || 3
    : Number(section.modelRows) || Number(section.rows) || 3;
}

export function sectionSetName(section: PaperSectionLike): string {
  return `Section ${section.name}`;
}

export function totalQuestionsFromRules(sections: PaperSectionLike[] | undefined): number {
  return (sections ?? []).reduce((sum, sec) => sum + sectionQuestionCount(sec), 0);
}

export function resolveQuestionPapersFromRules(rules: any): QuestionPaperLike[] {
  const sharedSections =
    Array.isArray(rules?.sections) && rules.sections.length > 0 ? rules.sections : [];

  if (Array.isArray(rules?.questionPapers)) {
    if (rules.questionPapers.length === 0) {
      return [];
    }
    return rules.questionPapers.map((paper: QuestionPaperLike) => ({
      ...paper,
      sections: sharedSections.length
        ? sharedSections.map((section: PaperSectionLike) => {
            const existing = paper.sections?.find((item) => item.name === section.name);
            return {
              ...section,
              id: (existing as PaperSectionRules | undefined)?.id ?? `${paper.id}-${section.name}`,
            };
          })
        : (paper.sections ?? []),
    }));
  }

  if (sharedSections.length > 0) {
    return [{ id: "1", name: "Question Paper 1", sections: sharedSections }];
  }
  return [];
}

/** Clone the last question paper (or fallback sections) as Question Paper N+1. */
export function createNextQuestionPaper(
  existing: QuestionPaperLike[],
  fallbackSections?: PaperSectionLike[],
  customName?: string,
  allowDuplicates = false,
  sharedRuleSections?: PaperSectionRules[],
): QuestionPaperLike {
  const nextIndex = existing.length + 1;
  const sourceSections = sharedRuleSections?.length
    ? sharedRuleSections
    : existing.length > 0
      ? existing[existing.length - 1].sections
      : fallbackSections ?? [];
  const stamp = Date.now();
  const trimmedName = customName?.trim();
  const clonedSections = cloneSectionsForNewQuestionPaper(
    sourceSections as Array<Partial<PaperSectionRules> & { name: string }>,
    allowDuplicates,
  );
  return {
    id: String(stamp),
    name: trimmedName || `Question Paper ${nextIndex}`,
    sections: clonedSections.map((section, index) => ({
      ...section,
      id: `${stamp}-${section.name}-${index}`,
    })),
  };
}

export function mergeQuestionPapersIntoRules(
  rules: Record<string, unknown> | null | undefined,
  questionPapers: QuestionPaperLike[],
  sharedSections?: PaperSectionRules[],
): Record<string, unknown> {
  const sections =
    sharedSections ??
    (questionPapers[0]?.sections as PaperSectionRules[] | undefined) ??
    (rules?.sections as PaperSectionRules[] | undefined) ??
    [];
  return {
    ...(rules ?? {}),
    questionPapers,
    sections,
  };
}

export function removeQuestionPaperFromRules(
  rules: Record<string, unknown> | null | undefined,
  questionPaperName: string,
): { rules: Record<string, unknown>; removed: QuestionPaperLike | undefined } {
  const papers = resolveQuestionPapersFromRules(rules);
  const removed = papers.find((paper) => paper.name === questionPaperName);
  const remaining = papers.filter((paper) => paper.name !== questionPaperName);
  if (!removed) {
    return { rules: { ...(rules ?? {}) }, removed: undefined };
  }
  return {
    rules: mergeQuestionPapersIntoRules(rules, remaining),
    removed,
  };
}

export function findQuestionPaperConfig(
  rules: any,
  questionPaperName: string,
): QuestionPaperLike | undefined {
  return resolveQuestionPapersFromRules(rules).find((paper) => paper.name === questionPaperName);
}

export function findSectionInQuestionPaper(
  questionPaper: QuestionPaperLike | undefined,
  sectionSetName: string,
): PaperSectionLike | undefined {
  const sectionName = sectionSetName.replace(/^Section\s+/i, "").trim();
  return questionPaper?.sections.find((section) => section.name === sectionName);
}

export function expectedQuestionsForSection(
  rules: any,
  questionPaperName: string,
  sectionSetName: string,
): number {
  const paper = findQuestionPaperConfig(rules, questionPaperName);
  const section = findSectionInQuestionPaper(paper, sectionSetName);
  return sectionQuestionCount(section);
}

export function expectedQuestionsForQuestionPaper(rules: any, questionPaperName: string): number {
  const paper = findQuestionPaperConfig(rules, questionPaperName);
  return totalQuestionsFromRules(paper?.sections);
}

export function parseQuestionSetLabel(setLabel: string | undefined): {
  questionPaperName: string;
  sectionSetName: string;
} {
  if (!setLabel) {
    return { questionPaperName: "Question Paper 1", sectionSetName: "Section A" };
  }
  if (setLabel.includes(" · ")) {
    const [questionPaperName, sectionPart] = setLabel.split(" · ");
    const sectionSetName = sectionPart.startsWith("Section ")
      ? sectionPart
      : `Section ${sectionPart.replace(/^Section\s+/i, "")}`;
    return { questionPaperName, sectionSetName };
  }
  if (setLabel.startsWith("Section ")) {
    return { questionPaperName: "Question Paper 1", sectionSetName: setLabel };
  }
  return { questionPaperName: setLabel, sectionSetName: "Section A" };
}

export function buildQuestionPaperTree(paper: any): QuestionPaperTree {
  const tree: QuestionPaperTree = {};

  for (const questionPaper of resolveQuestionPapersFromRules(paper?.rules)) {
    tree[questionPaper.name] = {};
    for (const section of questionPaper.sections) {
      tree[questionPaper.name][sectionSetName(section)] = [];
    }
  }

  for (const question of paper?.questions ?? []) {
    const parsed = question.questionPaperName
      ? {
          questionPaperName: question.questionPaperName,
          sectionSetName: question.sectionName ? sectionSetName({ name: question.sectionName }) : parseQuestionSetLabel(question.set).sectionSetName,
        }
      : parseQuestionSetLabel(question.set);

    const { questionPaperName, sectionSetName: sectionKey } = parsed;
    if (!tree[questionPaperName]) tree[questionPaperName] = {};
    if (!tree[questionPaperName][sectionKey]) tree[questionPaperName][sectionKey] = [];
    tree[questionPaperName][sectionKey].push({
      ...question,
      questionPaperName,
      sectionName: question.sectionName ?? sectionKey.replace(/^Section\s+/i, ""),
      set: question.set ?? `${questionPaperName} · ${sectionKey}`,
    });
  }

  return tree;
}

export function flattenQuestionPaperTree(tree: QuestionPaperTree): GeneratedQuestionLike[] {
  const flat: GeneratedQuestionLike[] = [];
  for (const [questionPaperName, sections] of Object.entries(tree)) {
    for (const [sectionSetName, questions] of Object.entries(sections)) {
      const sectionName = sectionSetName.replace(/^Section\s+/i, "");
      questions.forEach((question, index) => {
        flat.push({
          ...question,
          qNo: index + 1,
          questionPaperName,
          sectionName,
          set: `${questionPaperName} · Section ${sectionName}`,
        });
      });
    }
  }
  return flat;
}

export function totalGeneratedInTree(tree: QuestionPaperTree): number {
  return Object.values(tree).reduce(
    (sum, sections) =>
      sum + Object.values(sections).reduce((sectionSum, questions) => sectionSum + questions.length, 0),
    0,
  );
}

export function treeFromApiQuestionPapers(
  questionPapers: Record<string, { sections?: Record<string, GeneratedQuestionLike[]> }> | undefined,
): QuestionPaperTree {
  const tree: QuestionPaperTree = {};
  if (!questionPapers) return tree;
  for (const [paperName, payload] of Object.entries(questionPapers)) {
    tree[paperName] = {};
    for (const [sectionName, questions] of Object.entries(payload.sections ?? {})) {
      tree[paperName][sectionName] = questions ?? [];
    }
  }
  return tree;
}

/** @deprecated Use expectedQuestionsForSection with question paper context. */
export function findSectionBySetName(
  sections: PaperSectionLike[] | undefined,
  setName: string,
): PaperSectionLike | undefined {
  const name = setName.replace(/^Section\s+/i, "").trim();
  return (sections ?? []).find((s) => s.name === name);
}

/** @deprecated Use expectedQuestionsForSection with question paper context. */
export function orderedSectionSetNames(sections: PaperSectionLike[] | undefined): string[] {
  return (sections ?? []).map(sectionSetName);
}

/** @deprecated Use expectedQuestionsForSection with question paper context. */
export function expectedQuestionsForSet(paper: any, setName: string): number {
  const parsed = parseQuestionSetLabel(setName);
  return expectedQuestionsForSection(paper?.rules, parsed.questionPaperName, parsed.sectionSetName);
}

type GenerationFailureLike = {
  sectionName?: string;
  generated?: number;
  expected?: number;
  reason?: string;
};

/** Format backend paper-generation errors for toast display. */
export function formatPaperGenerationError(
  error: unknown,
  fallback = "Failed to generate questions from rules",
): string {
  const data = (error as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;

  const rawMessage = data.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : fallback;

  const failures = Array.isArray(data.failures) ? (data.failures as GenerationFailureLike[]) : [];
  if (failures.length) {
    const detail = failures
      .map((failure) => {
        const name = failure.sectionName ?? "Section";
        const generated = failure.generated ?? 0;
        const expected = failure.expected ?? "?";
        const reason = failure.reason ? ` — ${failure.reason}` : "";
        return `${name} ${generated}/${expected}${reason}`;
      })
      .join("; ");
    return `${message} (${detail})`;
  }

  const auditErrors = Array.isArray(data.auditErrors) ? (data.auditErrors as string[]) : [];
  if (auditErrors.length) {
    return `${message} — ${auditErrors.slice(0, 2).join("; ")}`;
  }

  return message;
}
