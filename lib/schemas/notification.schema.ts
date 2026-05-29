import { z } from "zod";

/**
 * Zod schema for a single notification row from the backend.
 * Validates fields so the UI never crashes on unexpected shapes.
 */
export const NotificationRowSchema = z.object({
  id: z.number(),
  title: z.string().default(""),
  message: z.string().optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().optional(),
  type: z.string().optional(),
  link: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  // Fields read by mapApiNotificationRow — must be present so Zod doesn't strip them
  body: z.string().optional(),
  recipientId: z.number().optional(),
  recipientType: z.string().optional(),
  readAt: z.string().nullable().optional(),
});

export type NotificationRow = z.infer<typeof NotificationRowSchema>;

export const UnreadCountSchema = z.object({
  count: z.number().default(0),
});

/**
 * Parses a raw notification row.  Returns a safe default on failure.
 */
export function safeParseNotification(
  raw: unknown,
  onMismatch?: (issues: z.ZodIssue[]) => void,
): NotificationRow {
  const result = NotificationRowSchema.safeParse(raw);
  if (!result.success) {
    onMismatch?.(result.error.issues);
    return {
      id: 0,
      title: "",
      isRead: false,
      body: "",
    };
  }
  return result.data;
}
