import type { Dispatch, SetStateAction } from "react";

/** Convert select-style string values to numbers for known numeric fields. */
function convertNumericField(
  field: string,
  value: string | boolean | number,
  numericFields: readonly string[],
): string | boolean | number {
  if (numericFields.includes(field) && typeof value === "string") {
    return parseInt(value, 10) || 0;
  }
  return value;
}

/**
 * Replace only this step's field errors, preserving API/async errors on
 * other fields. Step validators that call `setErrors(newErrors)` wipe
 * server-reported duplicates on Next — use
 * `setErrors(prev => replaceStepErrors(prev, STEP_FIELDS, newErrors))`.
 */
export function replaceStepErrors(
  prev: Record<string, string>,
  stepFields: readonly string[],
  next: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(prev)) {
    if (!stepFields.includes(key)) out[key] = message;
  }
  return { ...out, ...next };
}

/** Field change handler that converts numeric fields and clears the field error. */
export function makeFieldChangeHandler<T extends object>(
  setFormData: Dispatch<SetStateAction<T>>,
  errors: Record<string, string>,
  setErrors: Dispatch<SetStateAction<Record<string, string>>>,
  numericFields: readonly string[],
) {
  return (field: string, value: string | boolean | number) => {
    const convertedValue = convertNumericField(field, value, numericFields);
    setFormData((prev) => ({ ...prev, [field]: convertedValue }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };
}
