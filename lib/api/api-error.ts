/**
 * ApiError - standard error wrapper for service-layer failures.
 *
 * Wrapping throws in `ApiError` lets consumers distinguish a known API failure
 * from an unexpected JavaScript bug, and produces more structured telemetry.
 *
 * Usage (in a service function):
 *   try {
 *     return unwrapData<Student[]>(await api.get('/students'));
 *   } catch (err) {
 *     throw new ApiError('listStudents', err);
 *   }
 *
 * Consumers:
 *   if (err instanceof ApiError) {
 *     sendClientLog({ level: 'error', event: 'api-error', message: err.message,
 *                     context: { operation: err.operation } });
 *   }
 */
export class ApiError extends Error {
  /** Human-readable name of the service operation (e.g. "listStudents"). */
  readonly operation: string;
  /** Original error thrown by axios or an upstream caller. */
  readonly cause: unknown;

  constructor(operation: string, cause: unknown) {
    const message =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : "Unknown error";
    super(`[${operation}] ${message}`);
    this.name = "ApiError";
    this.operation = operation;
    this.cause = cause;
    // Ensure `instanceof ApiError` works after TypeScript transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
