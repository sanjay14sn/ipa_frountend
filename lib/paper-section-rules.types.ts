export type SectionType = "Mental/Zhusuan" | "Multiplication" | "Division";

export type RuleSource = "model" | "override";

export type CompositionMode = "uniform" | "mixed" | "model" | "custom";

export type PatternSelectionMode = "random" | "model" | "custom";

export type DigitPositionPattern = "random" | "model" | "fixed" | "custom";

export type OperationPattern = "random" | "model" | "custom";

export type FirstNumberSign = "Positive" | "Negative" | "Either" | "Model Paper Pattern";

export type FollowingNumbersSign =
  | "Positive Only"
  | "Negative Only"
  | "Positive / Negative"
  | "Model Paper Pattern";

export type NegativeFrequency =
  | "None"
  | "Random"
  | "Model Pattern"
  | "Custom Percentage";

export interface DigitCompositionGroup {
  digits: number;
  count: number;
  min: number;
  max: number;
}

/** One allowed digit-count layout (e.g. 4×2-digit OR 1×2-digit + 3×1-digit). */
export interface CompositionPattern {
  id: string;
  name?: string;
  groups: DigitCompositionGroup[];
}

export interface DigitComposition {
  mode: CompositionMode;
  uniformDigitType?: number;
  groups?: DigitCompositionGroup[];
  /** Multiple allowed layouts when mode is "model". */
  patterns?: CompositionPattern[];
  /** How the generator picks a pattern per question. */
  patternSelection?: PatternSelectionMode;
  /** Percent weights when patternSelection is "custom" (same order as patterns). */
  customPatternWeights?: number[];
  /** Snapshot used when mode is "model" — loaded from saved JSON, never hardcoded by level. */
  modelGroups?: DigitCompositionGroup[];
  /** Per-row digit widths when mode is "custom". */
  customRowDigits?: number[];
}

export interface AdvancedMentalRules {
  answerRule?: string;
  minAnswer?: number;
  maxAnswer?: number;
  zeroAllowed?: string;
  repeatedNumbers?: string;
  consecutiveNumbers?: string;
  carry?: string;
  borrow?: string;
}

export interface MultiplicationRules {
  firstOperandDigits: string;
  secondOperandDigits: string;
  minFirstOperand: string;
  maxFirstOperand: string;
  minSecondOperand: string;
  maxSecondOperand: string;
}

export interface DivisionRules {
  dividendDigits: string;
  divisorDigits: string;
  minDividend: string;
  maxDividend: string;
  minDivisor: string;
  maxDivisor: string;
  remainderRule: string;
}

/** Generic section rule object — rendered entirely from JSON. */
export interface PaperSectionRules {
  id: string;
  name: string;
  type: SectionType;

  questions: number;
  rows: number;
  time: string;
  ops: string[];

  digitComposition: DigitComposition;
  digitPositionPattern: DigitPositionPattern;
  fixedDigitPositions?: number[];
  customDigitPositions?: number[];

  operationPattern: OperationPattern;
  customOperationPattern?: string;

  firstNumberSign: FirstNumberSign;
  followingNumbersSign: FollowingNumbersSign;
  negativeFrequency: NegativeFrequency;
  negativeFrequencyPercent?: number;

  advancedMental?: AdvancedMentalRules;

  multiplication?: MultiplicationRules;
  division?: DivisionRules;

  ruleSource: RuleSource;
  modelQuestions: number;
  modelRows: number;
  modelTime: string;
  modelDigitComposition?: DigitComposition;
  modelOperationPattern?: OperationPattern;
  modelCustomOperationPattern?: string;
  modelDigitPositionPattern?: DigitPositionPattern;
  modelFixedDigitPositions?: number[];

  /** Legacy fields preserved for backend generator compatibility. */
  numType?: string;
  minRange?: number;
  maxRange?: number;
  startWith?: string;
  opPattern?: string;
  customPattern?: string;
  negFreq?: string;
  firstOperandDigits?: string;
  secondOperandDigits?: string;
  minFirstOperand?: string;
  maxFirstOperand?: string;
  minSecondOperand?: string;
  maxSecondOperand?: string;
  dividendDigits?: string;
  divisorDigits?: string;
  minDividend?: string;
  maxDividend?: string;
  minDivisor?: string;
  maxDivisor?: string;
  remainderRule?: string;
}

export interface QuestionPaperRulesConfig {
  id: string;
  name: string;
  sections: PaperSectionRules[];
}

export interface SectionValidationResult {
  valid: boolean;
  errors: string[];
}
