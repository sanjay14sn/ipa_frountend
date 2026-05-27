import { STANDARDS, type StandardValue } from "@/lib/constants/education";

const DATE_FIELDS = [
  "dateOfBirth",
  "dateOfJoining",
  "previousCompletedAt",
] as const;

const STANDARD_BY_NUMBER = new Map<number, StandardValue>(
  STANDARDS.map((standard) => {
    const match = standard.match(/^(\d+)/);
    return match ? [Number(match[1]), standard] : null;
  }).filter((entry): entry is [number, StandardValue] => entry !== null),
);

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function normalizeStudentImportDate(value: unknown): string {
  const raw = stringValue(value);
  if (!raw) return raw;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return isoDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    ) ?? raw;
  }

  const dayFirstMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dayFirstMatch) {
    return (
      isoDate(
        Number(dayFirstMatch[3]),
        Number(dayFirstMatch[2]),
        Number(dayFirstMatch[1]),
      ) ?? raw
    );
  }

  return raw;
}

export function normalizeStudentImportSex(value: unknown): string {
  const raw = stringValue(value);
  const key = raw.toLowerCase();
  if (key === "m" || key === "male") return "Male";
  if (key === "f" || key === "female") return "Female";
  return raw;
}

export function normalizeStudentImportStandard(value: unknown): string {
  const raw = stringValue(value);
  if (!raw) return raw;

  const exact = STANDARDS.find(
    (standard) => standard.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact;

  const compact = raw.toLowerCase().replace(/[\s-]+/g, "");
  if (compact === "prekg") return "Pre-KG";
  if (compact === "lkg") return "LKG";
  if (compact === "ukg") return "UKG";

  const numericMatch = raw.match(/^(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (numericMatch) {
    return STANDARD_BY_NUMBER.get(Number(numericMatch[1])) ?? raw;
  }

  return raw;
}

export function normalizeStudentBulkImportRow(
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};

  for (const field of DATE_FIELDS) {
    const normalized = normalizeStudentImportDate(row[field]);
    if (normalized !== stringValue(row[field])) {
      patch[field] = normalized;
    }
  }

  const sex = normalizeStudentImportSex(row.sex);
  if (sex !== stringValue(row.sex)) {
    patch.sex = sex;
  }

  const standard = normalizeStudentImportStandard(row.standard);
  if (standard !== stringValue(row.standard)) {
    patch.standard = standard;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
