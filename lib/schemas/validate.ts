import { z } from "zod";
import { sendClientLog } from "@/lib/client-telemetry";

/**
 * Validate `data` against `schema`. On success returns the parsed value;
 * on failure fires a telemetry event and returns the raw data as-is
 * (rather than crashing — schema validation is observability, not a hard gate).
 */
export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context: { service: string },
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    sendClientLog({
      level: "warn",
      event: "schema-mismatch",
      message: `Schema mismatch in ${context.service}`,
      context: {
        service: context.service,
        errors: result.error.issues.slice(0, 5),
      },
    });
    // Return raw data — don't crash, just log.
    return data as z.infer<T>;
  }
  return result.data;
}
