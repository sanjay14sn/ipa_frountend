import { AxiosError } from 'axios';

export interface BackendErrorResponse {
  code?: string;
  message: string;
  statusCode?: number;
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
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError<BackendErrorResponse>;
    
    // Check if response exists
    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      // Try to get message from error response
      if (typeof errorData === 'object') {
        // Handle ErrorException format: { code, message }
        if ('message' in errorData) {
          const msg = (errorData as { message: unknown }).message;
          if (typeof msg === 'string') return msg;
          if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
        }
        
        // Handle nested error objects
        if ('error' in errorData && typeof errorData.error === 'object') {
          const nestedError = errorData.error as BackendErrorResponse;
          if (nestedError.message) {
            return nestedError.message;
          }
        }
      }
      
      // Fallback to status text if available
      if (axiosError.response.statusText) {
        return axiosError.response.statusText;
      }
    }
    
    // Handle network errors
    if (axiosError.code === 'NETWORK_ERROR' || axiosError.message.includes('Network Error')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Handle timeout errors
    if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message || fallback;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
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

  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError<BackendErrorResponse>;
    
    if (axiosError.response?.data) {
      const errorData = axiosError.response.data;
      
      if (typeof errorData === 'object') {
        if ('code' in errorData && typeof errorData.code === 'string') {
          return errorData.code;
        }
        
        if ('error' in errorData && typeof errorData.error === 'object') {
          const nestedError = errorData.error as BackendErrorResponse;
          return nestedError.code;
        }
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
  
  // Map common error codes to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_PASSWORD: 'Invalid username or password',
    USER_NOT_FOUND: 'Invalid username or password',
    FRANCHISEE_NOT_FOUND: 'Invalid username or password',
    ADMIN_USER_NOT_FOUND: 'Invalid username or password',
    INSUFFICIENT_INVENTORY: message,
    INVALID_ORDER_STATUS: message,
    ORDER_NOT_FOUND: 'Order not found',
    INVENTORY_NOT_FOUND: 'Inventory item not found',
    STUDENT_NOT_FOUND: 'Student not found',
    FRANCHISE_NOT_FOUND: 'Franchise not found',
    FILE_REQUIRED: 'Please select a file to upload',
    FILE_TOO_LARGE: 'File is too large. Please upload a smaller file.',
    INVALID_FILE_TYPE: 'Invalid file type. Please check the file format.',
    CSV_PARSE_ERROR: 'Failed to parse CSV file. Please check the file format.',
    CSV_PARSING_ERROR: 'Failed to parse CSV file. Please check the file format.',
    EMPTY_CSV: 'CSV file is empty or contains no valid data',
    UPLOAD_FAILED: 'File upload failed. Please try again.',
    REQUIRED_FIELD_MISSING: 'Please fill in all required fields',
    INVALID_QUANTITY: 'Invalid quantity',
    INVALID_PRICE: 'Invalid price',
    DUPLICATE_STUDENT: 'Student already exists',
    DUPLICATE_ROLL_NUMBER: 'Roll number already exists',
    FRANCHISE_ALREADY_EXISTS: 'A franchise with this name already exists',
    DUPLICATE_FRANCHISE: 'Franchise already exists',
  };
  
  if (code && friendlyMessages[code]) {
    return friendlyMessages[code];
  }
  
  return message;
}
