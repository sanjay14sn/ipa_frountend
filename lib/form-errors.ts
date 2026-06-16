import { toast } from "sonner";
import { resolveApiError, type NormalizedApiError } from "@/lib/error-utils";

type ErrorsState = Record<string, string>;
type SetErrors = (updater: (prev: ErrorsState) => ErrorsState) => void;

export interface HandleFormErrorOptions {
  /** Component error-state setter (a React `useState` dispatcher). */
  setErrors?: SetErrors;
  /**
   * Map a canonical field name returned by the resolver
   * (`email` / `phone` / `franchiseName` / `rollNo`) to this form's own input
   * name (e.g. `email` → `mail`). Unmapped fields are used as-is.
   */
  fieldMap?: Record<string, string>;
  /** Map a form field name → the wizard step it lives on, to auto-navigate. */
  fieldToStep?: Record<string, number>;
  /** Navigate a multi-step form to the first offending field's step. */
  goToStep?: (step: number) => void;
  /** Fallback message when the error carries none. */
  fallback?: string;
  /** Show a toast (default `true`). */
  toast?: boolean;
}

/**
 * Central handler for API errors raised from a form submit.
 *
 * Resolves the error into a friendly, actionable message plus per-field errors,
 * applies those field errors to the form's error state (mapping canonical →
 * form field names), navigates a multi-step form to the first offending field,
 * and shows a single toast.
 *
 * Returns the normalised error so callers can branch further if needed.
 */
export function handleFormApiError(
  error: unknown,
  options: HandleFormErrorOptions = {},
): NormalizedApiError {
  const resolved = resolveApiError(error, options.fallback);

  const formFieldErrors: ErrorsState = {};
  for (const [canonical, message] of Object.entries(resolved.fieldErrors)) {
    const formField = options.fieldMap?.[canonical] ?? canonical;
    formFieldErrors[formField] = message;
  }

  const erroredFields = Object.keys(formFieldErrors);
  if (erroredFields.length > 0 && options.setErrors) {
    options.setErrors((prev) => ({ ...prev, ...formFieldErrors }));

    if (options.fieldToStep && options.goToStep) {
      for (const field of erroredFields) {
        const step = options.fieldToStep[field];
        if (step != null) {
          options.goToStep(step);
          break;
        }
      }
    }
  }

  if (options.toast !== false) {
    toast.error(resolved.message);
  }

  return resolved;
}
