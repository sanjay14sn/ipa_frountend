import { AxiosError } from 'axios';
import { sendClientLog } from '@/lib/client-telemetry';

/**
 * Shape of the structured error body the backend returns from its global
 * `HttpExceptionFilter`:
 *   { success: false, statusCode, code, title, message, requestId, details }
 * `details` may carry field-level validation info as `{ fields: { ... } }`.
 */
interface BackendErrorResponse {
  code?: string;
  title?: string;
  message?: string | string[];
  statusCode?: number;
  requestId?: string;
  details?: unknown;
}

/** Canonical-field → user-facing message map for inline form display. */
export interface ApiFieldErrors {
  [field: string]: string;
}

/** Fully normalised view of an API error, ready for both toast + inline use. */
export interface NormalizedApiError {
  status?: number;
  code?: string;
  title?: string;
  /** Best user-facing message (specific backend copy wins over generic codes). */
  message: string;
  /** Canonical field name → message (e.g. `email`, `phone`, `franchiseName`). */
  fieldErrors: ApiFieldErrors;
  isNetworkError: boolean;
  requestId?: string;
}

const RAW_CONSTANT_PATTERN = /^[A-Z][A-Z0-9_:. -]+$/;
const DEFAULT_FALLBACK = 'An error occurred. Please try again.';

/**
 * Codes whose canonical frontend copy must ALWAYS win over the backend text.
 * These are authentication failures: we intentionally avoid revealing whether
 * the account exists (anti-enumeration) and keep one consistent line. Used by
 * the login cards — do not move these to the fallback map.
 */
const OVERRIDE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  INVALID_PASSWORD: 'Invalid username or password.',
  USER_NOT_FOUND: 'Invalid username or password.',
  FRANCHISEE_NOT_FOUND: 'Invalid username or password.',
  ADMIN_USER_NOT_FOUND: 'Invalid username or password.',
  ADMIN_NOT_FOUND: 'Invalid username or password.',
};

/**
 * Friendly copy used only as a FALLBACK — when the backend did not send a
 * specific, human-readable message for the code. A specific backend message
 * always takes precedence over these (that was the core display bug: the old
 * code returned the generic copy for any `BAD_REQUEST`, hiding messages like
 * "An account with this email already exists").
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  BAD_REQUEST: 'Please check the submitted information and try again.',
  VALIDATION_FAILED: 'Please fix the highlighted fields and try again.',
  UNAUTHORIZED: 'Please sign in again to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'We could not find the requested item.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our side. Please try again.',
  ORDER_NOT_FOUND: 'Order not found.',
  INVENTORY_NOT_FOUND: 'Inventory item not found.',
  STUDENT_NOT_FOUND: 'Student not found.',
  FRANCHISE_NOT_FOUND: 'Franchise not found.',
  INSUFFICIENT_STOCK: 'There is not enough stock to complete this request.',
  INSUFFICIENT_INVENTORY: 'There is not enough inventory to complete this request.',
  INVALID_ORDER_STATUS: 'This order cannot be moved to the requested status.',
  INVALID_STATE: 'This item cannot be changed from its current state.',
  CONFLICT: 'This action conflicts with an existing record.',
  DUPLICATE_VALUE: 'This value is already in use. Please review the highlighted fields.',
  PROGRAM_REQUEST_EXISTS:
    'You already have a pending or active request for this program. Please wait for it to be reviewed.',
  PROGRAM_AGREEMENT_EXISTS:
    'This program is already active for your franchise — no new request is needed.',
  PAYMENT_REQUIRED: 'Payment is required before this action can continue.',
  FILE_REQUIRED: 'Please select a file to upload.',
  FILE_TOO_LARGE: 'File is too large. Please upload a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please check the file format.',
  CSV_PARSE_ERROR: 'Failed to parse CSV file. Please check the file format.',
  CSV_PARSING_ERROR: 'Failed to parse CSV file. Please check the file format.',
  EMPTY_CSV: 'CSV file is empty or contains no valid data.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  REQUIRED_FIELD_MISSING: 'Please fill in all required fields.',
  INVALID_QUANTITY: 'Invalid quantity.',
  INVALID_PRICE: 'Invalid price.',
  DUPLICATE_STUDENT: 'Student already exists.',
};

/**
 * Pattern rules matched against the backend MESSAGE text. Duplicates now
 * arrive as `DUPLICATE_VALUE` + `details.fields`, which `fieldErrorsFromParsed`
 * consumes directly — these rules remain as a fallback for older prose-only
 * `BAD_REQUEST` responses. Order matters — first match wins.
 */
interface SemanticRule {
  test: (lowerMsg: string) => boolean;
  field: string;
  message: string;
}

const DUP_WORDS = ['already', 'exist', 'registered', 'taken', 'in use', 'unique', 'duplicate'];
const hasAny = (msg: string, words: string[]) => words.some((w) => msg.includes(w));

const SEMANTIC_RULES: SemanticRule[] = [
  {
    // "mail" matches email / e-mail / mail.
    test: (m) => m.includes('mail') && hasAny(m, DUP_WORDS),
    field: 'email',
    message: 'This email address is already registered. Please use a different email.',
  },
  {
    test: (m) => hasAny(m, ['phone', 'mobile', 'contact number']) && hasAny(m, DUP_WORDS),
    field: 'phone',
    message: 'This phone number is already registered. Please use a different number.',
  },
  {
    test: (m) => m.includes('franchise name') && hasAny(m, DUP_WORDS),
    field: 'franchiseName',
    message: 'A franchise with this name already exists. Please choose a different name.',
  },
  {
    test: (m) => hasAny(m, ['roll number', 'roll no']) && hasAny(m, DUP_WORDS),
    field: 'rollNo',
    message: 'This roll number is already in use. Please enter a different one.',
  },
];

function isRawConstant(value: string): boolean {
  return RAW_CONSTANT_PATTERN.test(value.trim()) && value.includes('_');
}

/** Returns a trimmed string only if it is human-readable (not an ALL_CAPS code). */
function safeMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || isRawConstant(trimmed)) return undefined;
  return trimmed;
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = safeMessage(v);
      if (s) return s;
    }
    return undefined;
  }
  return safeMessage(value);
}

/** Heuristic guard so raw ORM/DB errors never reach the user verbatim. */
function looksLikeDbError(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes('sequelize') ||
    s.includes('violates') ||
    (s.includes('constraint') && hasAny(s, ['unique', 'foreign', 'null'])) ||
    (s.includes('unique') && s.includes('validation error'))
  );
}

interface ParsedError {
  status?: number;
  statusText?: string;
  code?: string;
  title?: string;
  /** Specific human-readable backend message (raw ALL_CAPS constants filtered out). */
  message?: string;
  /** Field-level validation messages carried in `details.fields.form`. */
  rawMessages?: string[];
  /** Raw `details.fields` object, if present. */
  fields?: Record<string, unknown>;
  isNetworkError: boolean;
  isTimeout: boolean;
  requestId?: string;
}

function getAxiosLikeError(
  error: unknown,
): AxiosError<BackendErrorResponse> | undefined {
  if (
    !error ||
    typeof error !== 'object' ||
    !('response' in error || 'isAxiosError' in error)
  ) {
    return undefined;
  }
  return error as AxiosError<BackendErrorResponse>;
}

function getNestedError(data: unknown): BackendErrorResponse | undefined {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'object' &&
    (data as { error: unknown }).error !== null
  ) {
    return (data as { error: BackendErrorResponse }).error;
  }
  return undefined;
}

function parseError(error: unknown): ParsedError {
  const out: ParsedError = { isNetworkError: false, isTimeout: false };
  if (!error) return out;

  const axiosError = getAxiosLikeError(error);
  if (axiosError) {
    const resp = axiosError.response;
    out.status = resp?.status;
    out.statusText = resp?.statusText || undefined;

    const data = resp?.data;
    if (data && typeof data === 'object') {
      const d = data as BackendErrorResponse;
      const nested = getNestedError(data);
      out.code = (typeof d.code === 'string' && d.code) || (nested?.code as string | undefined);
      out.title = safeMessage(d.title) ?? safeMessage(nested?.title);
      out.message = firstString(d.message) ?? firstString(nested?.message);
      out.requestId = d.requestId;

      const details = (d.details ?? nested?.details) as
        | { fields?: Record<string, unknown> }
        | undefined;
      if (details && typeof details === 'object' && details.fields && typeof details.fields === 'object') {
        out.fields = details.fields as Record<string, unknown>;
        const form = (details.fields as { form?: unknown }).form;
        if (Array.isArray(form)) {
          out.rawMessages = form.map(String).filter((s) => s.trim().length > 0);
        } else if (typeof form === 'string' && form.trim()) {
          out.rawMessages = [form.trim()];
        }
      }
    }

    if (!out.status) {
      const code = axiosError.code;
      if (code === 'ECONNABORTED' || /timeout/i.test(axiosError.message || '')) {
        out.isTimeout = true;
      } else if (
        code === 'ERR_NETWORK' ||
        code === 'NETWORK_ERROR' ||
        /network error/i.test(axiosError.message || '')
      ) {
        out.isNetworkError = true;
      }
    }
    return out;
  }

  if (error instanceof Error) {
    out.message = safeMessage(error.message);
    return out;
  }
  if (typeof error === 'string') {
    out.message = safeMessage(error);
    return out;
  }
  return out;
}

/** Resolve which field (if any) an error relates to, with normalised copy. */
function detectField(
  message: string | undefined,
): { field: string; message: string } | undefined {
  if (message) {
    const lower = message.toLowerCase();
    for (const rule of SEMANTIC_RULES) {
      if (rule.test(lower)) return { field: rule.field, message: rule.message };
    }
  }
  return undefined;
}

function fieldErrorsFromParsed(parsed: ParsedError): ApiFieldErrors {
  const out: ApiFieldErrors = {};
  const detected = detectField(parsed.message);
  if (detected) out[detected.field] = detected.message;

  if (parsed.fields) {
    for (const [key, value] of Object.entries(parsed.fields)) {
      if (key === 'form' || out[key]) continue;
      const msg =
        firstString(value) ??
        (Array.isArray(value)
          ? value.map(String).join(' ')
          : typeof value === 'string'
            ? value
            : undefined);
      if (msg) out[key] = msg;
    }
  }
  return out;
}

/**
 * Core resolution precedence. The key fix vs. the previous implementation: a
 * specific, human-readable backend message wins over the generic code mapping
 * (steps 2–4 below) instead of the other way around.
 */
function resolveMessage(parsed: ParsedError, fallback: string): string {
  // 1. Auth overrides — always win (anti-enumeration / consistent copy).
  if (parsed.code && OVERRIDE_MESSAGES[parsed.code]) {
    return OVERRIDE_MESSAGES[parsed.code];
  }

  // 2. Field-specific normalisation (duplicate email/phone/name, etc.).
  const detected = detectField(parsed.message);
  if (detected) return detected.message;

  // 3. Never leak a raw ORM/DB error string to the user.
  if (parsed.message && looksLikeDbError(parsed.message)) {
    return 'This record conflicts with existing data. Please review your input and try again.';
  }

  // 4. Validation errors put the generic "check your input" line in `message`
  //    and the specific, per-field reasons in details.fields.form — prefer those.
  if (
    parsed.code === 'VALIDATION_FAILED' &&
    parsed.rawMessages &&
    parsed.rawMessages.length
  ) {
    return parsed.rawMessages.join('; ');
  }

  // 5. Specific, human-readable backend message (the previously-discarded case:
  //    e.g. "An account with this email already exists", which beats the generic
  //    `title`/code copy below).
  if (parsed.message) return parsed.message;

  // 6. Any other validation-style detail messages.
  if (parsed.rawMessages && parsed.rawMessages.length) {
    return parsed.rawMessages.join('; ');
  }

  // 7. Backend title (e.g. "Program already active").
  if (parsed.title) return parsed.title;

  // 8. Friendly fallback by code.
  if (parsed.code && FALLBACK_MESSAGES[parsed.code]) {
    return FALLBACK_MESSAGES[parsed.code];
  }

  // 9. Transport-level fallbacks.
  if (parsed.isNetworkError) {
    return 'Could not reach the server. Please check your connection and try again.';
  }
  if (parsed.isTimeout) return 'Request timed out. Please try again.';
  if (parsed.statusText && parsed.statusText.toLowerCase() !== 'internal server error') {
    return parsed.statusText;
  }

  return fallback;
}

/** Log codes we don't explicitly recognise so the maps can be extended. */
function maybeLogUnmappedCode(parsed: ParsedError): void {
  const code = parsed.code;
  if (!code) return;
  if (OVERRIDE_MESSAGES[code] || FALLBACK_MESSAGES[code]) {
    return;
  }
  sendClientLog({
    level: 'warn',
    event: 'unmapped-error-code',
    message: `Unmapped error code: ${code}`,
    statusCode: parsed.status,
    context: { code },
  });
}

/**
 * Extract the best user-facing message from an API/axios error.
 * Specific backend messages take precedence over generic code-based copy.
 */
export function extractErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const parsed = parseError(error);
  maybeLogUnmappedCode(parsed);
  return resolveMessage(parsed, fallback);
}

/** Extract the backend error code (e.g. `BAD_REQUEST`, `PROGRAM_REQUEST_EXISTS`). */
export function extractErrorCode(error: unknown): string | undefined {
  return parseError(error).code;
}

/** Alias of {@link extractErrorMessage}, kept for existing call sites. */
export function getErrorMessage(error: unknown, fallback?: string): string {
  return extractErrorMessage(error, fallback ?? DEFAULT_FALLBACK);
}

/** Alias of {@link extractErrorMessage}, kept for existing call sites. */
export function getUserFriendlyMessage(error: unknown, fallback?: string): string {
  return extractErrorMessage(error, fallback ?? DEFAULT_FALLBACK);
}

/**
 * Per-field errors for inline form display, keyed by canonical field name.
 * Combines pattern/code detection (email/phone/name/roll) with any explicit
 * `details.fields` entries the backend supplies.
 */
export function getApiFieldErrors(error: unknown): ApiFieldErrors {
  return fieldErrorsFromParsed(parseError(error));
}

/** One-shot, fully normalised view of an API error for toast + inline use. */
export function resolveApiError(
  error: unknown,
  fallback?: string,
): NormalizedApiError {
  const parsed = parseError(error);
  maybeLogUnmappedCode(parsed);
  return {
    status: parsed.status,
    code: parsed.code,
    title: parsed.title,
    message: resolveMessage(parsed, fallback ?? DEFAULT_FALLBACK),
    fieldErrors: fieldErrorsFromParsed(parsed),
    isNetworkError: parsed.isNetworkError,
    requestId: parsed.requestId,
  };
}
