import { AxiosError } from 'axios';

export interface BackendErrorResponse {
  code?: string;
  title?: string;
  message: string;
  statusCode?: number;
  requestId?: string;
  details?: unknown;
}

const RAW_CONSTANT_PATTERN = /^[A-Z][A-Z0-9_:. -]+$/;

const friendlyMessages: Record<string, string> = {
  BAD_REQUEST: "Please check the submitted information and try again.",
  VALIDATION_FAILED: "Please fix the highlighted fields and try again.",
  UNAUTHORIZED: "Please sign in again to continue.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "We could not find the requested item.",
  INTERNAL_SERVER_ERROR: "Something went wrong on our side. Please try again.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  INVALID_PASSWORD: "Invalid username or password.",
  USER_NOT_FOUND: "Invalid username or password.",
  FRANCHISEE_NOT_FOUND: "Invalid username or password.",
  ADMIN_USER_NOT_FOUND: "Invalid username or password.",
  ADMIN_NOT_FOUND: "Invalid username or password.",
  ORDER_NOT_FOUND: "Order not found.",
  INVENTORY_NOT_FOUND: "Inventory item not found.",
  STUDENT_NOT_FOUND: "Student not found.",
  FRANCHISE_NOT_FOUND: "Franchise not found.",
  FILE_REQUIRED: "Please select a file to upload.",
  FILE_TOO_LARGE: "File is too large. Please upload a smaller file.",
  INVALID_FILE_TYPE: "Invalid file type. Please check the file format.",
  CSV_PARSE_ERROR: "Failed to parse CSV file. Please check the file format.",
  CSV_PARSING_ERROR: "Failed to parse CSV file. Please check the file format.",
  EMPTY_CSV: "CSV file is empty or contains no valid data.",
  UPLOAD_FAILED: "File upload failed. Please try again.",
  REQUIRED_FIELD_MISSING: "Please fill in all required fields.",
  INVALID_QUANTITY: "Invalid quantity.",
  INVALID_PRICE: "Invalid price.",
  DUPLICATE_STUDENT: "Student already exists.",
  DUPLICATE_ROLL_NUMBER: "Roll number already exists.",
  FRANCHISE_ALREADY_EXISTS: "A franchise with this name already exists.",
  DUPLICATE_FRANCHISE: "Franchise already exists.",
  INSUFFICIENT_STOCK: "There is not enough stock to complete this request.",
  INSUFFICIENT_INVENTORY: "There is not enough inventory to complete this request.",
  INVALID_ORDER_STATUS: "This order cannot be moved to the requested status.",
  INVALID_STATE: "This item cannot be changed from its current state.",
  CONFLICT: "This action conflicts with an existing record.",
  PAYMENT_REQUIRED: "Payment is required before this action can continue.",
};

function isRawConstant(value: string): boolean {
  return RAW_CONSTANT_PATTERN.test(value.trim()) && value.includes("_");
}

function safeMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || isRawConstant(trimmed)) return undefined;
  return trimmed;
}

function getNestedError(data: unknown): BackendErrorResponse | undefined {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "object"
  ) {
    return (data as { error: BackendErrorResponse }).error;
  }
  return undefined;
}

function getAxiosLikeError(error: unknown): AxiosError<BackendErrorResponse> | undefined {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined;
  }
  return error as AxiosError<BackendErrorResponse>;
}

/**
 * Extract error message from axios error response
 */
export function extractErrorMessage(
  error: unknown,
  fallback: string = 'An error occurred. Please try again.',
): string {
  if (!error) {
    return fallback;
  }

  // Handle Axios errors
  const axiosError = getAxiosLikeError(error);
  if (axiosError) {
    
    // Check if response exists
    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      // Try to get message from error response
      if (typeof errorData === 'object') {
        if ('code' in errorData && typeof errorData.code === 'string') {
          const mapped = friendlyMessages[errorData.code];
          if (mapped) return mapped;
        }

        const friendlyTitle = safeMessage((errorData as { title?: unknown }).title);
        if (friendlyTitle) return friendlyTitle;

        // Handle ErrorException format: { code, message }
        if ('message' in errorData) {
          const msg = (errorData as { message: unknown }).message;
          const message = Array.isArray(msg) && msg.length > 0 ? msg[0] : msg;
          const safe = safeMessage(message);
          if (safe) return safe;
        }
        
        // Handle nested error objects
        const nestedError = getNestedError(errorData);
        if (nestedError?.code && friendlyMessages[nestedError.code]) {
          return friendlyMessages[nestedError.code];
        }
        const nestedTitle = safeMessage(nestedError?.title);
        if (nestedTitle) return nestedTitle;
        const nestedMessage = safeMessage(nestedError?.message);
        if (nestedMessage) {
          return nestedMessage;
        }
      }
      
      // Fallback to status text if available
      if (axiosError.response.statusText) {
        return axiosError.response.statusText;
      }
    }
    
    // Handle network errors
    if (axiosError.code === 'NETWORK_ERROR' || axiosError.message.includes('Network Error')) {
      return 'Could not reach the server. Please check your connection and try again.';
    }
    
    // Handle timeout errors
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return safeMessage(error.message) || fallback;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return safeMessage(error) || fallback;
  }

  return fallback;
}

/**
 * Extract error code from axios error response
 */
export function extractErrorCode(error: unknown): string | undefined {
  if (!error) {
    return undefined;
  }

  const axiosError = getAxiosLikeError(error);
  if (axiosError) {
    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      if (typeof errorData === 'object') {
        if ('code' in errorData && typeof errorData.code === 'string') {
          return errorData.code;
        }
        
        const nestedError = getNestedError(errorData);
        return nestedError?.code;
      }
    }
  }

  return undefined;
}

/**
 * Get formatted error message with fallback
 */
export function getErrorMessage(
  error: unknown,
  fallback?: string,
): string {
  return extractErrorMessage(error, fallback);
}

/**
 * Check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: string): boolean {
  const errorCode = extractErrorCode(error);
  return errorCode === code;
}

/**
 * Get user-friendly error message based on error code
 */
export function getUserFriendlyMessage(error: unknown, fallback?: string): string {
  const code = extractErrorCode(error);
  const message = extractErrorMessage(error, fallback);
  
  if (code && friendlyMessages[code]) {
    return friendlyMessages[code];
  }
  
  return message;
}
