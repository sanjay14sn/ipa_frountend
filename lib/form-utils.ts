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
