export type FeeRuleType =
  | "REG_PLUS_FULL_COURSE"
  | "REG_PLUS_FIRST_MONTH"
  | "REG_ONLY"
  | "CUSTOM";

export interface FeeCalculationInput {
  feeRule: FeeRuleType;
  registrationFee: number | string;
  courseFee: number | string;
  durationMonths: number;
}

export interface FeeCalculationResult {
  registrationFee: number;
  courseFee: number;
  monthlyFee: number;
  totalPayable: number;
  breakdownLabel: string;
  breakdownParts: string[];
}

export function parseFeeAmount(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

export function computeMonthlyFee(courseFee: number, durationMonths: number): number {
  const months = Math.max(1, durationMonths || 1);
  return parseFeeAmount(courseFee / months);
}

export function computeFeeTotals(input: FeeCalculationInput): FeeCalculationResult {
  const registrationFee = parseFeeAmount(input.registrationFee);
  const courseFee = parseFeeAmount(input.courseFee);
  const durationMonths = Math.max(1, input.durationMonths || 1);
  const monthlyFee = computeMonthlyFee(courseFee, durationMonths);

  switch (input.feeRule) {
    case "REG_PLUS_FULL_COURSE": {
      const totalPayable = parseFeeAmount(registrationFee + courseFee);
      return {
        registrationFee,
        courseFee,
        monthlyFee,
        totalPayable,
        breakdownLabel: "Registration + Full Course Fee",
        breakdownParts: [
          `Registration Fee: ₹${registrationFee.toLocaleString("en-IN")}`,
          `Course Fee: ₹${courseFee.toLocaleString("en-IN")}`,
        ],
      };
    }
    case "REG_PLUS_FIRST_MONTH": {
      const totalPayable = parseFeeAmount(registrationFee + monthlyFee);
      return {
        registrationFee,
        courseFee,
        monthlyFee,
        totalPayable,
        breakdownLabel: "Registration + First Month Installment",
        breakdownParts: [
          `Registration Fee: ₹${registrationFee.toLocaleString("en-IN")}`,
          `First Month (${durationMonths} mo plan): ₹${monthlyFee.toLocaleString("en-IN")}`,
        ],
      };
    }
    case "REG_ONLY": {
      return {
        registrationFee,
        courseFee,
        monthlyFee,
        totalPayable: registrationFee,
        breakdownLabel: "Registration Fee Only (due now)",
        breakdownParts: [
          `Registration Fee: ₹${registrationFee.toLocaleString("en-IN")}`,
          `Next installment after due period: ₹${monthlyFee.toLocaleString("en-IN")}/mo`,
        ],
      };
    }
    case "CUSTOM":
    default: {
      const totalPayable = parseFeeAmount(registrationFee + courseFee);
      return {
        registrationFee,
        courseFee,
        monthlyFee,
        totalPayable,
        breakdownLabel: "Custom (Registration + Course Fee)",
        breakdownParts: [
          `Registration Fee: ₹${registrationFee.toLocaleString("en-IN")}`,
          `Course Fee: ₹${courseFee.toLocaleString("en-IN")}`,
        ],
      };
    }
  }
}

/** Add calendar months and return ISO date (YYYY-MM-DD). */
export function addMonthsToDate(startDate: string, months: number): string {
  if (!startDate) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  if (!year || !month || !day) return "";

  const anchorDay = day;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";

  const targetMonthIndex = date.getMonth() + Math.max(0, months);
  const result = new Date(date.getFullYear(), targetMonthIndex, 1);
  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(anchorDay, lastDayOfTargetMonth));

  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, "0");
  const dd = String(result.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function resolveLevelDurationMonths(level: unknown, fallback = 3): number {
  if (level && typeof level === "object") {
    const record = level as Record<string, unknown>;
    const fromMonths = Number(record.durationInMonths);
    if (Number.isFinite(fromMonths) && fromMonths > 0) return fromMonths;
    const fromLegacy = Number(record.duration);
    if (Number.isFinite(fromLegacy) && fromLegacy > 0) return fromLegacy;
  }
  return fallback;
}
