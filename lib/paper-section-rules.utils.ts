import type {
  CompositionMode,
  CompositionPattern,
  DigitComposition,
  DigitCompositionGroup,
  OperationPattern,
  PaperSectionRules,
  PatternSelectionMode,
  QuestionPaperRulesConfig,
  SectionType,
  SectionValidationResult,
} from "./paper-section-rules.types";

export const DIGIT_TYPE_OPTIONS = [1, 2, 3, 4, 5] as const;

export const DEFAULT_DIGIT_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 1, max: 9 },
  2: { min: 10, max: 99 },
  3: { min: 100, max: 999 },
  4: { min: 1000, max: 9999 },
  5: { min: 10000, max: 99999 },
};

export function digitLabel(digits: number): string {
  return `${digits} Digit`;
}

export function defaultRangeForDigits(digits: number): { min: number; max: number } {
  return DEFAULT_DIGIT_RANGES[digits] ?? DEFAULT_DIGIT_RANGES[1];
}

export function uniformGroups(digitType: number, rowCount: number): DigitCompositionGroup[] {
  const range = defaultRangeForDigits(digitType);
  return [{ digits: digitType, count: rowCount, min: range.min, max: range.max }];
}

export function emptyMixedGroups(): DigitCompositionGroup[] {
  return DIGIT_TYPE_OPTIONS.map((digits) => ({
    digits,
    count: 0,
    ...defaultRangeForDigits(digits),
  }));
}

export function compositionGroupTotal(groups: DigitCompositionGroup[] | undefined): number {
  return (groups ?? []).reduce((sum, group) => sum + (Number(group.count) || 0), 0);
}

export function normalizePatternGroups(
  groups: DigitCompositionGroup[] | undefined,
): DigitCompositionGroup[] {
  return DIGIT_TYPE_OPTIONS.map((digits) => {
    const existing = groups?.find((g) => g.digits === digits);
    const range = defaultRangeForDigits(digits);
    const min = Number(existing?.min);
    const max = Number(existing?.max);
    return {
      digits,
      count: Number(existing?.count) || 0,
      min: Number.isFinite(min) && min > 0 ? min : range.min,
      max: Number.isFinite(max) && max > 0 ? max : range.max,
    };
  });
}

export function normalizeCompositionPattern(
  pattern: CompositionPattern,
  index: number,
): CompositionPattern {
  return {
    id: pattern.id || `pattern-${index + 1}`,
    name: pattern.name || `Pattern ${index + 1}`,
    groups: normalizePatternGroups(pattern.groups),
  };
}

/** Ensure model mode always has at least one pattern; migrate legacy single-group data. */
export function normalizeCompositionPatterns(
  composition: DigitComposition,
  rows: number,
): CompositionPattern[] {
  if (composition.patterns?.length) {
    return composition.patterns.map((pattern, index) => normalizeCompositionPattern(pattern, index));
  }

  const legacyGroups = composition.modelGroups?.length
    ? composition.modelGroups
    : composition.groups?.length
      ? composition.groups
      : null;

  if (legacyGroups?.length) {
    return [
      normalizeCompositionPattern(
        { id: "pattern-1", name: "Pattern 1", groups: legacyGroups.map((g) => ({ ...g })) },
        0,
      ),
    ];
  }

  return [
    normalizeCompositionPattern(
      { id: "pattern-1", name: "Pattern 1", groups: emptyMixedGroups() },
      0,
    ),
  ];
}

export function activeCompositionPatterns(section: PaperSectionRules): CompositionPattern[] {
  const composition = activeDigitComposition(section);
  if (composition.mode !== "model") return [];
  return normalizeCompositionPatterns(composition, effectiveRows(section));
}

const PATTERN_SAMPLE_NUMBERS: Record<number, number[]> = {
  1: [4, 2, 3, 7, 9, 5, 8, 6],
  2: [22, 34, 12, 10, 14, 18, 16, 20],
  3: [123, 456, 789, 234],
  4: [1234, 5678, 9012],
  5: [12345, 67890],
};

/** Illustrative row preview for a composition pattern card. */
export function formatPatternExample(groups: DigitCompositionGroup[]): string {
  const expanded: number[] = [];
  const sorted = [...groups].sort((a, b) => b.digits - a.digits);
  for (const group of sorted) {
    for (let i = 0; i < group.count; i++) {
      expanded.push(group.digits);
    }
  }
  if (!expanded.length) return "—";

  const ops = ["", "+", "-", "+"];
  return expanded
    .map((digits, index) => {
      const pool = PATTERN_SAMPLE_NUMBERS[digits] ?? [5];
      const value = pool[index % pool.length];
      return index === 0 ? String(value) : `${ops[index % ops.length] || "+"}${value}`;
    })
    .join("\n");
}

export function patternIsValid(groups: DigitCompositionGroup[], rows: number): boolean {
  return compositionGroupTotal(groups) === rows;
}

export function addCompositionPattern(section: PaperSectionRules): PaperSectionRules {
  const rows = effectiveRows(section);
  const composition = section.digitComposition;
  const patterns = normalizeCompositionPatterns(composition, rows);
  const nextPattern: CompositionPattern = normalizeCompositionPattern(
    {
      id: `pattern-${Date.now()}`,
      name: `Pattern ${patterns.length + 1}`,
      groups: emptyMixedGroups(),
    },
    patterns.length,
  );

  return syncLegacyFields({
    ...section,
    digitComposition: {
      ...composition,
      mode: "model",
      patterns: [...patterns, nextPattern],
      patternSelection: composition.patternSelection ?? "model",
    },
  });
}

export function removeCompositionPattern(
  section: PaperSectionRules,
  patternId: string,
): PaperSectionRules {
  const rows = effectiveRows(section);
  const composition = section.digitComposition;
  const patterns = normalizeCompositionPatterns(composition, rows).filter((p) => p.id !== patternId);

  if (!patterns.length) {
    return section;
  }

  const allPatterns = normalizeCompositionPatterns(composition, rows);
  const removedIndex = allPatterns.findIndex((p) => p.id === patternId);
  const customPatternWeights = composition.customPatternWeights?.filter((_, index) => index !== removedIndex);

  return syncLegacyFields({
    ...section,
    digitComposition: {
      ...composition,
      mode: "model",
      patterns,
      customPatternWeights,
    },
  });
}

export function updateCompositionPatternGroup(
  section: PaperSectionRules,
  patternId: string,
  digitType: number,
  field: "count" | "min" | "max",
  value: number,
): PaperSectionRules {
  const rows = effectiveRows(section);
  const composition = section.digitComposition;
  const patterns = normalizeCompositionPatterns(composition, rows).map((pattern) => {
    if (pattern.id !== patternId) return pattern;
    const groups = pattern.groups.map((group) =>
      group.digits === digitType ? { ...group, [field]: value } : group,
    );
    return { ...pattern, groups };
  });

  return syncLegacyFields({
    ...section,
    digitComposition: {
      ...composition,
      mode: "model",
      patterns,
    },
  });
}

export function setPatternSelection(
  section: PaperSectionRules,
  patternSelection: PatternSelectionMode,
): PaperSectionRules {
  const rows = effectiveRows(section);
  const composition = section.digitComposition;
  const patterns = normalizeCompositionPatterns(composition, rows);
  const customPatternWeights =
    patternSelection === "custom"
      ? patterns.map((_, index) => composition.customPatternWeights?.[index] ?? Math.floor(100 / patterns.length))
      : composition.customPatternWeights;

  return syncLegacyFields({
    ...section,
    digitComposition: {
      ...composition,
      patternSelection,
      customPatternWeights,
    },
  });
}

export function updatePatternWeight(
  section: PaperSectionRules,
  patternIndex: number,
  weight: number,
): PaperSectionRules {
  const composition = section.digitComposition;
  const patterns = normalizeCompositionPatterns(composition, effectiveRows(section));
  const customPatternWeights = patterns.map(
    (_, index) => (index === patternIndex ? weight : composition.customPatternWeights?.[index] ?? 0),
  );

  return syncLegacyFields({
    ...section,
    digitComposition: {
      ...composition,
      customPatternWeights,
    },
  });
}

export function syncPatternsToRows(
  composition: DigitComposition,
  rows: number,
): DigitComposition {
  if (composition.mode !== "model") return composition;
  const patterns = normalizeCompositionPatterns(composition, rows);
  const primary = patterns[0]?.groups ?? emptyMixedGroups();
  return {
    ...composition,
    patterns,
    groups: primary.map((g) => ({ ...g })),
    modelGroups: primary.map((g) => ({ ...g })),
  };
}

export function effectiveRows(section: PaperSectionRules): number {
  if (section.type !== "Mental/Zhusuan") return 1;
  return section.ruleSource === "override"
    ? Number(section.rows) || Number(section.modelRows) || 1
    : Number(section.modelRows) || Number(section.rows) || 1;
}

export function effectiveQuestions(section: PaperSectionRules): number {
  return section.ruleSource === "override"
    ? Number(section.questions) || Number(section.modelQuestions) || 0
    : Number(section.modelQuestions) || Number(section.questions) || 0;
}

export function effectiveTime(section: PaperSectionRules): string {
  return section.ruleSource === "override"
    ? section.time || section.modelTime
    : section.modelTime || section.time;
}

export function activeDigitComposition(section: PaperSectionRules): DigitComposition {
  if (section.type !== "Mental/Zhusuan") {
    return { mode: "uniform", uniformDigitType: 1, groups: uniformGroups(1, 1) };
  }
  if (section.ruleSource === "model" && section.modelDigitComposition) {
    return section.modelDigitComposition;
  }
  return section.digitComposition;
}

/** Live composition for the rule-builder form (not the frozen model snapshot). */
export function formDigitComposition(
  section: PaperSectionRules,
  preferLive = false,
): DigitComposition {
  const rows = effectiveRows(section);
  if (preferLive || section.ruleSource === "override") {
    return normalizeDigitComposition(section.digitComposition, rows);
  }
  return activeDigitComposition(section);
}

export function formCompositionPatterns(
  section: PaperSectionRules,
  preferLive = false,
): CompositionPattern[] {
  const composition = formDigitComposition(section, preferLive);
  if (composition.mode !== "model") return [];
  return normalizeCompositionPatterns(composition, effectiveRows(section));
}

export function legacyNumTypeToDigitType(numType?: string): number {
  const match = numType?.match(/(\d)/);
  return match ? Number(match[1]) : 1;
}

export function inferCompositionFromLegacy(section: Partial<PaperSectionRules>): DigitComposition {
  const rows = effectiveRows(section as PaperSectionRules) || Number(section.modelRows) || Number(section.rows) || 1;

  if (section.digitComposition) {
    return normalizeDigitComposition(section.digitComposition, rows);
  }

  const numType = section.numType ?? "1 Digit";
  if (numType.toLowerCase().includes("mixed")) {
    const groups = emptyMixedGroups();
    groups[0] = { ...groups[0], count: rows };
    return { mode: "mixed", groups, modelGroups: groups.map((g) => ({ ...g })) };
  }

  const digitType = legacyNumTypeToDigitType(numType);
  const groups = uniformGroups(digitType, rows);
  return {
    mode: "uniform",
    uniformDigitType: digitType,
    groups,
    modelGroups: groups.map((g) => ({ ...g })),
  };
}

export function normalizeDigitComposition(composition: DigitComposition, rows: number): DigitComposition {
  const mode = composition.mode ?? "uniform";
  const modelGroups = composition.modelGroups?.length
    ? composition.modelGroups.map((g) => ({ ...g }))
    : composition.groups?.map((g) => ({ ...g }));

  if (mode === "uniform") {
    const digitType = composition.uniformDigitType ?? composition.groups?.[0]?.digits ?? 1;
    const groups = uniformGroups(digitType, rows);
    return {
      mode: "uniform",
      uniformDigitType: digitType,
      groups,
      modelGroups: modelGroups ?? groups.map((g) => ({ ...g })),
      customRowDigits: composition.customRowDigits,
    };
  }

  if (mode === "mixed" || mode === "custom") {
    const groups =
      composition.groups?.length
        ? composition.groups.map((g) => ({
            digits: g.digits,
            count: Number(g.count) || 0,
            min: Number(g.min) ?? defaultRangeForDigits(g.digits).min,
            max: Number(g.max) ?? defaultRangeForDigits(g.digits).max,
          }))
        : emptyMixedGroups();

    return {
      mode,
      groups,
      modelGroups: modelGroups ?? groups.map((g) => ({ ...g })),
      customRowDigits: composition.customRowDigits,
      uniformDigitType: composition.uniformDigitType,
    };
  }

  if (mode === "model") {
    const patterns = normalizeCompositionPatterns(composition, rows);
    const primary = patterns[0]?.groups ?? emptyMixedGroups();
    return {
      mode: "model",
      patterns,
      patternSelection: composition.patternSelection ?? "model",
      customPatternWeights: composition.customPatternWeights,
      groups: primary.map((g) => ({ ...g })),
      modelGroups: primary.map((g) => ({ ...g })),
      uniformDigitType: composition.uniformDigitType,
    };
  }

  return inferCompositionFromLegacy({ rows, modelRows: rows });
}

export function mapLegacyOperationPattern(value?: string): OperationPattern {
  if (value === "Model Paper Pattern") return "model";
  if (value === "Custom" || value === "Custom Pattern") return "custom";
  return "random";
}

export function operationPatternToLegacy(pattern: OperationPattern): string {
  if (pattern === "model") return "Model Paper Pattern";
  if (pattern === "custom") return "Custom";
  return "Random";
}

export function normalizeSectionRules(raw: Partial<PaperSectionRules>): PaperSectionRules {
  const type: SectionType = raw.type ?? "Mental/Zhusuan";
  const rows = type === "Mental/Zhusuan" ? Number(raw.rows ?? raw.modelRows) || 1 : 1;
  const digitComposition = inferCompositionFromLegacy({ ...raw, rows });

  const operationPattern =
    raw.operationPattern ?? mapLegacyOperationPattern(raw.opPattern ?? raw.customPattern ? raw.opPattern : raw.opPattern);

  const mult: PaperSectionRules["multiplication"] = {
    firstOperandDigits: raw.multiplication?.firstOperandDigits ?? raw.firstOperandDigits ?? "2 digit",
    secondOperandDigits: raw.multiplication?.secondOperandDigits ?? raw.secondOperandDigits ?? "1 digit",
    minFirstOperand: raw.multiplication?.minFirstOperand ?? raw.minFirstOperand ?? "",
    maxFirstOperand: raw.multiplication?.maxFirstOperand ?? raw.maxFirstOperand ?? "",
    minSecondOperand: raw.multiplication?.minSecondOperand ?? raw.minSecondOperand ?? "",
    maxSecondOperand: raw.multiplication?.maxSecondOperand ?? raw.maxSecondOperand ?? "",
  };

  const div: PaperSectionRules["division"] = {
    dividendDigits: raw.division?.dividendDigits ?? raw.dividendDigits ?? "3 digit",
    divisorDigits: raw.division?.divisorDigits ?? raw.divisorDigits ?? "1 digit",
    minDividend: raw.division?.minDividend ?? raw.minDividend ?? "",
    maxDividend: raw.division?.maxDividend ?? raw.maxDividend ?? "",
    minDivisor: raw.division?.minDivisor ?? raw.minDivisor ?? "",
    maxDivisor: raw.division?.maxDivisor ?? raw.maxDivisor ?? "",
    remainderRule: raw.division?.remainderRule ?? raw.remainderRule ?? "Exact division only",
  };

  let ops = raw.ops ?? ["+"];
  if (type === "Multiplication") ops = ["*"];
  if (type === "Division") ops = ["/"];
  if (type === "Mental/Zhusuan" && ops.some((op) => op === "*" || op === "/")) {
    ops = ops.includes("-") ? ["+", "-"] : ["+"];
  }

  const uniformDigit = digitComposition.uniformDigitType ?? 1;
  const range = defaultRangeForDigits(uniformDigit);

  return {
    id: raw.id ?? String(Date.now()),
    name: raw.name ?? "A",
    type,
    questions: Number(raw.questions ?? raw.modelQuestions) || 25,
    rows,
    time: String(raw.time ?? raw.modelTime ?? "1.25"),
    ops,
    digitComposition,
    digitPositionPattern: raw.digitPositionPattern ?? "model",
    fixedDigitPositions: raw.fixedDigitPositions ?? [],
    customDigitPositions: raw.customDigitPositions ?? [],
    operationPattern,
    customOperationPattern: raw.customOperationPattern ?? raw.customPattern ?? "+ - + - +",
    firstNumberSign: raw.firstNumberSign ?? "Positive",
    followingNumbersSign: raw.followingNumbersSign ?? "Positive Only",
    negativeFrequency:
      raw.negativeFrequency ??
      (raw.negFreq === "Model Pattern" ? "Model Pattern" : "None"),
    negativeFrequencyPercent: raw.negativeFrequencyPercent,
    advancedMental: raw.advancedMental,
    multiplication: mult,
    division: div,
    ruleSource: raw.ruleSource ?? "model",
    modelQuestions: Number(raw.modelQuestions ?? raw.questions) || 25,
    modelRows: type === "Mental/Zhusuan" ? Number(raw.modelRows ?? raw.rows) || rows : 1,
    modelTime: String(raw.modelTime ?? raw.time ?? "1.25"),
    modelDigitComposition: raw.modelDigitComposition ?? digitComposition,
    modelOperationPattern: raw.modelOperationPattern ?? operationPattern,
    modelCustomOperationPattern: raw.modelCustomOperationPattern ?? raw.customPattern,
    modelDigitPositionPattern: raw.modelDigitPositionPattern ?? raw.digitPositionPattern ?? "model",
    modelFixedDigitPositions: raw.modelFixedDigitPositions ?? raw.fixedDigitPositions,
    numType: raw.numType ?? digitLabel(uniformDigit),
    minRange: raw.minRange ?? range.min,
    maxRange: raw.maxRange ?? range.max,
    startWith: raw.startWith,
    opPattern: operationPatternToLegacy(operationPattern),
    customPattern: raw.customOperationPattern ?? raw.customPattern,
    negFreq: raw.negFreq,
    ...mult,
    ...div,
  };
}

export function syncLegacyFields(section: PaperSectionRules): PaperSectionRules {
  const composition = activeDigitComposition(section);
  const rows = effectiveRows(section);

  let numType = "1 Digit";
  let minRange = 1;
  let maxRange = 9;

  if (composition.mode === "uniform") {
    const d = composition.uniformDigitType ?? 1;
    numType = digitLabel(d);
    const range = defaultRangeForDigits(d);
    minRange = composition.groups?.[0]?.min ?? range.min;
    maxRange = composition.groups?.[0]?.max ?? range.max;
  } else if (composition.mode === "model") {
    numType = "Model Patterns";
    const patterns = normalizeCompositionPatterns(composition, rows);
    const activeGroups = patterns.flatMap((pattern) => pattern.groups.filter((g) => g.count > 0));
    if (activeGroups.length) {
      minRange = Math.min(...activeGroups.map((g) => g.min));
      maxRange = Math.max(...activeGroups.map((g) => g.max));
    }
  } else if (composition.groups?.length) {
    numType = "Mixed";
    minRange = Math.min(...composition.groups.filter((g) => g.count > 0).map((g) => g.min));
    maxRange = Math.max(...composition.groups.filter((g) => g.count > 0).map((g) => g.max));
  }

  return {
    ...section,
    rows: section.type === "Mental/Zhusuan" ? rows : 1,
    numType,
    minRange,
    maxRange,
    opPattern: operationPatternToLegacy(section.operationPattern),
    customPattern: section.customOperationPattern,
    negFreq:
      section.negativeFrequency === "Model Pattern"
        ? "Model Pattern"
        : section.negativeFrequency,
    firstOperandDigits: section.multiplication?.firstOperandDigits,
    secondOperandDigits: section.multiplication?.secondOperandDigits,
    minFirstOperand: section.multiplication?.minFirstOperand,
    maxFirstOperand: section.multiplication?.maxFirstOperand,
    minSecondOperand: section.multiplication?.minSecondOperand,
    maxSecondOperand: section.multiplication?.maxSecondOperand,
    dividendDigits: section.division?.dividendDigits,
    divisorDigits: section.division?.divisorDigits,
    minDividend: section.division?.minDividend,
    maxDividend: section.division?.maxDividend,
    minDivisor: section.division?.minDivisor,
    maxDivisor: section.division?.maxDivisor,
    remainderRule: section.division?.remainderRule,
  };
}

export function createDefaultSection(name: string, index: number): PaperSectionRules {
  const rows = defaultMentalRowsForSection(name);
  const ops = name === "A" ? ["+"] : ["+", "-"];
  const followingNumbersSign =
    name === "A" || name === "B" ? "Positive Only" : "Positive / Negative";

  if (name === "C" || name === "D") {
    const pattern =
      name === "C"
        ? {
            id: "pattern-1",
            name: "Pattern 1",
            groups: [
              { digits: 1, count: 3, min: 1, max: 9 },
              { digits: 2, count: 1, min: 10, max: 99 },
            ],
          }
        : {
            id: "pattern-1",
            name: "Pattern 1",
            groups: [
              { digits: 1, count: 2, min: 1, max: 9 },
              { digits: 2, count: 2, min: 10, max: 99 },
            ],
          };
    return normalizeSectionRules({
      id: String(Date.now() + index),
      name,
      type: "Mental/Zhusuan",
      questions: 25,
      rows,
      modelQuestions: 25,
      modelRows: rows,
      time: "1.25",
      modelTime: "1.25",
      ops,
      ruleSource: "model",
      digitComposition: {
        mode: "model",
        patternSelection: "model",
        patterns: [pattern],
        groups: pattern.groups.map((g) => ({ ...g })),
        modelGroups: pattern.groups.map((g) => ({ ...g })),
      },
      digitPositionPattern: name === "C" ? "random" : "model",
      operationPattern: "random",
      customOperationPattern: "+ - + -",
      firstNumberSign: "Positive",
      followingNumbersSign,
      negativeFrequency: "Model Pattern",
    });
  }

  return normalizeSectionRules({
    id: String(Date.now() + index),
    name,
    type: "Mental/Zhusuan",
    questions: 25,
    rows,
    modelQuestions: 25,
    modelRows: rows,
    time: "1.25",
    modelTime: "1.25",
    ops,
    ruleSource: "model",
    digitComposition: {
      mode: "uniform",
      uniformDigitType: 1,
      groups: uniformGroups(1, rows),
      modelGroups: uniformGroups(1, rows),
    },
    operationPattern: "random",
    customOperationPattern: "+ - + - +",
    digitPositionPattern: "model",
    firstNumberSign: "Positive",
    followingNumbersSign,
    negativeFrequency: "Model Pattern",
  });
}

export function defaultMentalRowsForSection(sectionName: string): number {
  if (sectionName === "A") return 3;
  return 4;
}

export function applySectionTypeChange(
  section: PaperSectionRules,
  newType: SectionType,
): PaperSectionRules {
  if (newType === section.type) return section;

  if (newType === "Mental/Zhusuan") {
    const restoredRows =
      (section.modelRows ?? 0) > 1
        ? section.modelRows!
        : (section.rows ?? 0) > 1
          ? section.rows!
          : defaultMentalRowsForSection(section.name);
    return syncModelSnapshot(
      normalizeSectionRules({
        ...section,
        type: newType,
        rows: restoredRows,
        modelRows: restoredRows,
        ops: section.ops?.includes("-") ? ["+", "-"] : ["+"],
      }),
    );
  }

  if (newType === "Multiplication") {
    return normalizeSectionRules({
      ...section,
      type: newType,
      ops: ["*"],
      rows: 1,
      modelRows: 1,
      multiplication: section.multiplication ?? {
        firstOperandDigits: "2 digit",
        secondOperandDigits: "1 digit",
        minFirstOperand: "10",
        maxFirstOperand: "99",
        minSecondOperand: "2",
        maxSecondOperand: "9",
      },
    });
  }

  return normalizeSectionRules({
    ...section,
    type: newType,
    ops: ["/"],
    rows: 1,
    modelRows: 1,
    division: section.division ?? {
      dividendDigits: "3 digit",
      divisorDigits: "1 digit",
      minDividend: "100",
      maxDividend: "999",
      minDivisor: "2",
      maxDivisor: "9",
      remainderRule: "Exact division only",
    },
  });
}

export function validateSectionRules(
  section: PaperSectionRules,
  options?: { allowDuplicates?: boolean; skipTimeValidation?: boolean },
): SectionValidationResult {
  const errors: string[] = [];
  const questions = effectiveQuestions(section);
  const rows = effectiveRows(section);
  const time = Number(effectiveTime(section));

  if (questions <= 0) errors.push("Questions must be greater than 0.");
  if (!options?.skipTimeValidation && time <= 0) errors.push("Time must be greater than 0.");
  if (section.type === "Mental/Zhusuan" && rows <= 0) {
    errors.push("Rows / Question must be greater than 0.");
  }

  if (section.type === "Mental/Zhusuan") {
    const composition = activeDigitComposition(section);

    if (composition.mode === "model") {
      const patterns = normalizeCompositionPatterns(composition, rows);
      if (!patterns.length) {
        errors.push("At least one digit composition pattern is required.");
      }
      patterns.forEach((pattern, index) => {
        const total = compositionGroupTotal(pattern.groups);
        if (total !== rows) {
          errors.push(
            `${pattern.name ?? `Pattern ${index + 1}`}: digit counts (${total}) must equal Rows / Question (${rows}).`,
          );
        }
      });
      if (composition.patternSelection === "custom") {
        const weights = composition.customPatternWeights ?? [];
        const weightTotal = weights.reduce((sum, w) => sum + (Number(w) || 0), 0);
        if (weightTotal !== 100) {
          errors.push("Custom pattern distribution weights must total 100%.");
        }
      }
    }

    if (composition.mode === "mixed" || composition.mode === "custom") {
      const total = compositionGroupTotal(composition.groups);
      if (total !== rows) {
        errors.push(`Digit composition total (${total}) must equal Rows / Question (${rows}).`);
      }
      for (const group of composition.groups ?? []) {
        if (group.count <= 0) continue;
        const expected = defaultRangeForDigits(group.digits);
        if (group.min > group.max) {
          errors.push(`${digitLabel(group.digits)}: minimum cannot exceed maximum.`);
        }
        if (group.digits === 1 && (group.min < 1 || group.max > 9)) {
          errors.push(`${digitLabel(group.digits)} range should stay within 1–9.`);
        }
        if (group.digits === 2 && (group.min < 10 || group.max > 99)) {
          errors.push(`${digitLabel(group.digits)} range should stay within 10–99.`);
        }
        if (group.min < expected.min || group.max > expected.max) {
          errors.push(`${digitLabel(group.digits)} range may be invalid for digit width.`);
        }
      }
    }

    if (section.digitPositionPattern === "fixed") {
      const positions = section.fixedDigitPositions ?? [];
      if (positions.length !== rows) {
        errors.push(`Fixed digit positions (${positions.length}) must match Rows / Question (${rows}).`);
      }
    }

    if (section.digitPositionPattern === "custom") {
      const positions = section.customDigitPositions ?? [];
      if (positions.length !== rows) {
        errors.push(`Custom digit positions (${positions.length}) must match Rows / Question (${rows}).`);
      }
    }

    if (section.operationPattern === "custom") {
      const tokens = (section.customOperationPattern ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (tokens.length > 0 && tokens.length !== Math.max(rows - 1, 0) && rows > 1) {
        errors.push(`Custom operation pattern should have ${Math.max(rows - 1, 0)} entries for ${rows} rows.`);
      }
    }
  }

  if (!options?.allowDuplicates) {
    const capacity = estimateSectionUniqueCapacity(section);
    if (hasProvenInsufficientCapacity(capacity, questions)) {
      errors.push(
        `Requires ${questions} unique questions but rules allow at most ${capacity.maxUnique} (${capacity.explanation} with duplicates disabled). Increase rows, widen ranges, reduce question count, or enable Allow Duplicates.`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface SectionCapacityEstimate {
  maxUnique: number | null;
  explanation: string;
}

function countValuesInDigitRange(digits: number, min: number, max: number): number {
  const widthMin = Math.pow(10, digits - 1);
  const widthMax = Math.pow(10, digits - 1) * 10 - 1;
  const low = Math.max(min, widthMin);
  const high = Math.min(max, widthMax);
  if (high < low) return 0;
  return high - low + 1;
}

function activeCompositionGroups(groups: DigitCompositionGroup[] | undefined): DigitCompositionGroup[] {
  return normalizePatternGroups(groups).filter((group) => group.count > 0);
}

function formatCompositionCapacityExplanation(groups: DigitCompositionGroup[]): string {
  return `fixed composition (${groups.map((g) => `${g.count}×${g.digits}D`).join(", ")})`;
}

function estimateCompositionGroupsCapacity(
  groups: DigitCompositionGroup[] | undefined,
  rows: number,
  digitPositionPattern: string | undefined,
): SectionCapacityEstimate | null {
  const normalized = activeCompositionGroups(groups);
  const totalRows = normalized.reduce((sum, group) => sum + group.count, 0);
  if (totalRows !== rows) return null;
  if (normalized.length === 0) {
    return { maxUnique: 0, explanation: "no digit groups configured" };
  }

  if (digitPositionPattern === "random" && normalized.length > 1) {
    return {
      maxUnique: null,
      explanation: "mixed digit positions with random shuffle",
    };
  }

  let combinations = 1;
  for (const group of normalized) {
    const perValue = countValuesInDigitRange(group.digits, group.min, group.max);
    if (perValue <= 0) {
      return {
        maxUnique: 0,
        explanation: `invalid ${group.digits}-digit range (${group.min}–${group.max})`,
      };
    }
    combinations *= Math.pow(perValue, group.count);
  }

  return {
    maxUnique: combinations,
    explanation: formatCompositionCapacityExplanation(normalized),
  };
}

export function estimateSectionUniqueCapacity(section: PaperSectionRules): SectionCapacityEstimate {
  if (section.type === "Multiplication") {
    return { maxUnique: null, explanation: "multiplication operand combinations" };
  }
  if (section.type === "Division") {
    return { maxUnique: null, explanation: "division with exact-quotient constraint" };
  }

  const composition = activeDigitComposition(section);
  const rows = effectiveRows(section);
  const mode = composition.mode ?? "uniform";
  const digitPositionPattern = section.digitPositionPattern ?? section.modelDigitPositionPattern;

  if (mode === "model") {
    const patterns = normalizeCompositionPatterns(composition, rows);
    if (patterns.length === 1) {
      const estimate = estimateCompositionGroupsCapacity(
        patterns[0].groups,
        rows,
        digitPositionPattern,
      );
      if (estimate) return estimate;
    }
    return { maxUnique: null, explanation: "multiple model patterns or unresolved composition" };
  }

  if (mode === "mixed") {
    const estimate = estimateCompositionGroupsCapacity(composition.groups, rows, digitPositionPattern);
    if (estimate) return estimate;
  }

  if (mode === "custom") {
    const rowDigits = composition.customRowDigits ?? [];
    if (rowDigits.length === rows) {
      const counts = new Map<number, number>();
      for (const digits of rowDigits) {
        counts.set(digits, (counts.get(digits) ?? 0) + 1);
      }
      const groups = [...counts.entries()].map(([digits, count]) => {
        const range = defaultRangeForDigits(digits);
        const fromSaved = composition.groups?.find((g) => g.digits === digits && g.count > 0);
        const minParsed = Number(fromSaved?.min);
        const maxParsed = Number(fromSaved?.max);
        return {
          digits,
          count,
          min: Number.isFinite(minParsed) && minParsed > 0 ? minParsed : range.min,
          max: Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : range.max,
        };
      });
      const estimate = estimateCompositionGroupsCapacity(groups, rows, digitPositionPattern);
      if (estimate) return estimate;
    }
  }

  if (mode === "uniform") {
    const digitType = composition.uniformDigitType ?? composition.groups?.[0]?.digits ?? 1;
    const group = composition.groups?.find((g) => g.digits === digitType) ?? composition.groups?.[0];
    const range = defaultRangeForDigits(digitType);
    const minParsed = Number(group?.min);
    const maxParsed = Number(group?.max);
    const min = Number.isFinite(minParsed) && minParsed > 0 ? minParsed : range.min;
    const max = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : range.max;
    const perRowValues = countValuesInDigitRange(digitType, min, max);

    if (rows === 1) {
      return {
        maxUnique: perRowValues,
        explanation: `${rows} row × ${digitType}-digit numbers (${min}–${max})`,
      };
    }

    if (section.ops.length === 1 && section.ops[0] === "+") {
      const minSum = rows * Math.max(min, 1);
      const maxSum = rows * max;
      return {
        maxUnique: Math.max(0, maxSum - minSum + 1),
        explanation: `${rows} rows of addition (approximate answer range ${minSum}–${maxSum})`,
      };
    }

    return { maxUnique: null, explanation: `${rows} rows with mixed operations` };
  }

  return { maxUnique: null, explanation: "rule complexity exceeds quick estimate" };
}

export function hasProvenInsufficientCapacity(
  estimate: SectionCapacityEstimate,
  target: number,
): boolean {
  return estimate.maxUnique !== null && estimate.maxUnique < target;
}

export function sectionNeedsRowRepair(section: PaperSectionRules, allowDuplicates: boolean): boolean {
  if (allowDuplicates || section.type !== "Mental/Zhusuan") return false;
  const capacity = estimateSectionUniqueCapacity(section);
  return hasProvenInsufficientCapacity(capacity, effectiveQuestions(section));
}

export function describeSectionRepairAction(section: PaperSectionRules): string {
  const rows = effectiveRows(section);
  const composition = activeDigitComposition(section);
  const questions = effectiveQuestions(section);

  if ((composition.mode ?? "uniform") === "uniform") {
    return `Increase rows (currently ${rows}) to support ${questions} unique questions`;
  }

  if (!section.ops.includes("-") && section.ops.includes("+")) {
    return "Enable + and − operations";
  }

  return `Adjust saved rules to support ${questions} unique questions`;
}

/** Sync live section fields into model snapshot (rules editor authoritative mode). */
export function syncModelSnapshot(section: PaperSectionRules): PaperSectionRules {
  const rows = effectiveRows(section);
  const source =
    section.ruleSource === "model" && section.modelDigitComposition
      ? section.modelDigitComposition
      : section.digitComposition;
  const composition = syncPatternsToRows(normalizeDigitComposition(source, rows), rows);

  const operationPattern = section.operationPattern ?? "random";
  const customOperationPattern = section.customOperationPattern ?? "+ - + -";
  const digitPositionPattern = section.digitPositionPattern ?? "model";
  const fixedDigitPositions = [...(section.fixedDigitPositions ?? [])];
  const customDigitPositions = [...(section.customDigitPositions ?? [])];

  return syncLegacyFields({
    ...section,
    rows: section.type === "Mental/Zhusuan" ? rows : 1,
    modelRows: section.type === "Mental/Zhusuan" ? rows : 1,
    questions: effectiveQuestions(section),
    modelQuestions: effectiveQuestions(section),
    time: effectiveTime(section),
    modelTime: effectiveTime(section),
    digitComposition: composition,
    modelDigitComposition: composition,
    operationPattern,
    modelOperationPattern: operationPattern,
    customOperationPattern,
    modelCustomOperationPattern: customOperationPattern,
    digitPositionPattern,
    modelDigitPositionPattern: digitPositionPattern,
    fixedDigitPositions,
    modelFixedDigitPositions: fixedDigitPositions,
    customDigitPositions,
  });
}

/** Raise rows / ops so unique-question capacity can meet the configured count. */
export function repairSectionForGeneration(section: PaperSectionRules): PaperSectionRules {
  const questions = effectiveQuestions(section);
  const capacity = estimateSectionUniqueCapacity(section);
  if (!hasProvenInsufficientCapacity(capacity, questions)) {
    return syncModelSnapshot(section);
  }

  if (section.type !== "Mental/Zhusuan") {
    return syncModelSnapshot(section);
  }

  const composition = activeDigitComposition(section);
  const currentRows = effectiveRows(section);

  if ((composition.mode ?? "uniform") === "uniform") {
    for (let rows = currentRows + 1; rows <= Math.max(currentRows + 4, 6); rows++) {
      let candidate = updateRowsOnSection(section, rows);
      if (sectionNeedsRowRepair(candidate, false)) {
        candidate = syncModelSnapshot(candidate);
      }
      const nextCapacity = estimateSectionUniqueCapacity(candidate);
      if (nextCapacity.maxUnique === null || nextCapacity.maxUnique >= questions) {
        return syncModelSnapshot(candidate);
      }
    }
  }

  if (!section.ops.includes("-") && section.ops.includes("+")) {
    const withOps = syncModelSnapshot(syncLegacyFields({ ...section, ops: ["+", "-"] }));
    const nextCapacity = estimateSectionUniqueCapacity(withOps);
    if (nextCapacity.maxUnique === null || nextCapacity.maxUnique >= questions) {
      return withOps;
    }
  }

  return syncModelSnapshot(section);
}

export function repairAllSectionsForGeneration(
  sections: PaperSectionRules[],
  allowDuplicates: boolean,
): PaperSectionRules[] {
  return sections.map((section) =>
    sectionNeedsRowRepair(section, allowDuplicates) ? repairSectionForGeneration(section) : syncModelSnapshot(section),
  );
}

/** Apply one shared section-rules set to every question paper (paper-level rules model). */
export function syncQuestionPapersWithSharedSections(
  questionPapers: QuestionPaperRulesConfig[],
  sharedSections: PaperSectionRules[],
): QuestionPaperRulesConfig[] {
  return questionPapers.map((paper) => ({
    ...paper,
    sections: sharedSections.map((section) => {
      const existing = paper.sections.find((item) => item.name === section.name);
      return syncLegacyFields({
        ...section,
        id: existing?.id ?? `${paper.id}-${section.name}`,
      });
    }),
  }));
}

export function resolveSharedSectionsFromRules(
  rules: { sections?: PaperSectionRules[]; questionPapers?: QuestionPaperRulesConfig[] } | null | undefined,
): PaperSectionRules[] {
  if (Array.isArray(rules?.sections) && rules.sections.length > 0) {
    return rules.sections;
  }
  return rules?.questionPapers?.[0]?.sections ?? [];
}

/** Deep-clone sections for a new question paper and repair generation blockers. */
export function cloneSectionsForNewQuestionPaper(
  sections: Array<Partial<PaperSectionRules> & { name: string }>,
  allowDuplicates = false,
): PaperSectionRules[] {
  const normalized = sections.map((section) => syncModelSnapshot(normalizeSectionRules(section)));
  return repairAllSectionsForGeneration(normalized, allowDuplicates);
}

export function formatCompositionSummary(section: PaperSectionRules): string {
  const composition = activeDigitComposition(section);
  if (composition.mode === "uniform") {
    const d = composition.uniformDigitType ?? 1;
    return `${digitLabel(d)} × ${effectiveRows(section)}`;
  }
  if (composition.mode === "model") {
    const patterns = normalizeCompositionPatterns(composition, effectiveRows(section));
    return patterns
      .map((pattern) => {
        const parts = pattern.groups
          .filter((g) => g.count > 0)
          .map((g) => `${digitLabel(g.digits)} × ${g.count}`);
        return `${pattern.name ?? "Pattern"}: ${parts.length ? parts.join(", ") : "—"}`;
      })
      .join(" | ");
  }
  const parts = (composition.groups ?? [])
    .filter((g) => g.count > 0)
    .map((g) => `${digitLabel(g.digits)} × ${g.count}`);
  return parts.length ? parts.join(", ") : "—";
}

export function formatPatternSelectionLabel(mode?: PatternSelectionMode): string {
  if (mode === "random") return "Random";
  if (mode === "custom") return "Custom Distribution";
  return "Model Paper Distribution";
}

export function formatOperationsSummary(ops: string[]): string {
  if (!ops.length) return "—";
  return ops
    .map((op) => (op === "*" ? "×" : op === "/" ? "÷" : op))
    .join(" / ");
}

export function isSectionEditable(section: PaperSectionRules): boolean {
  return section.ruleSource === "override";
}

export function updateRowsOnSection(section: PaperSectionRules, nextRows: number): PaperSectionRules {
  let composition = normalizeDigitComposition(section.digitComposition, nextRows);
  if (composition.mode === "uniform") {
    composition.groups = uniformGroups(composition.uniformDigitType ?? 1, nextRows);
  }
  composition = syncPatternsToRows(composition, nextRows);
  return syncLegacyFields({
    ...section,
    rows: nextRows,
    modelRows: section.ruleSource === "model" ? nextRows : section.modelRows,
    digitComposition: composition,
    modelDigitComposition:
      section.ruleSource === "model"
        ? composition
        : section.modelDigitComposition ?? section.digitComposition,
  });
}

export function switchRuleSource(
  section: PaperSectionRules,
  ruleSource: PaperSectionRules["ruleSource"],
): PaperSectionRules {
  if (ruleSource === "override") {
    return syncLegacyFields({
      ...section,
      ruleSource,
      questions: section.questions || section.modelQuestions,
      rows: section.type === "Mental/Zhusuan" ? effectiveRows(section) : 1,
      time: section.time || section.modelTime,
      digitComposition: section.digitComposition ?? section.modelDigitComposition,
    });
  }
  return syncLegacyFields({ ...section, ruleSource });
}

export function setCompositionMode(
  section: PaperSectionRules,
  mode: CompositionMode,
): PaperSectionRules {
  const rows = effectiveRows(section);
  let digitComposition: DigitComposition;

  if (mode === "uniform") {
    const digitType = section.digitComposition.uniformDigitType ?? 1;
    digitComposition = {
      mode: "uniform",
      uniformDigitType: digitType,
      groups: uniformGroups(digitType, rows),
      modelGroups: section.modelDigitComposition?.modelGroups,
    };
  } else if (mode === "model") {
    const existing = section.digitComposition.patterns?.length
      ? section.digitComposition.patterns
      : section.modelDigitComposition?.patterns;
    const seed = existing?.length
      ? { ...section.digitComposition, patterns: existing }
      : section.digitComposition;
    digitComposition = syncPatternsToRows(
      {
        ...seed,
        mode: "model",
        patternSelection: section.digitComposition.patternSelection ?? "model",
        customPatternWeights: section.digitComposition.customPatternWeights,
        modelGroups:
          section.modelDigitComposition?.modelGroups ?? section.digitComposition.modelGroups,
      },
      rows,
    );

    if (section.digitComposition.mode !== "model") {
      const patterns = normalizeCompositionPatterns(digitComposition, rows);
      if (patterns.length === 1) {
        digitComposition = syncPatternsToRows(
          {
            ...digitComposition,
            patterns: [
              ...patterns,
              normalizeCompositionPattern(
                {
                  id: `pattern-${Date.now()}`,
                  name: "Pattern 2",
                  groups: emptyMixedGroups(),
                },
                1,
              ),
            ],
          },
          rows,
        );
      }
    }
  } else if (mode === "mixed") {
    digitComposition = {
      mode: "mixed",
      groups: section.digitComposition.groups?.length
        ? section.digitComposition.groups.map((g) => ({ ...g }))
        : emptyMixedGroups(),
      modelGroups: section.digitComposition.modelGroups,
    };
  } else {
    digitComposition = {
      mode: "custom",
      customRowDigits: Array.from({ length: rows }, (_, i) => section.digitComposition.customRowDigits?.[i] ?? 1),
      groups: section.digitComposition.groups,
      modelGroups: section.digitComposition.modelGroups,
    };
  }

  return syncLegacyFields({ ...section, digitComposition });
}
