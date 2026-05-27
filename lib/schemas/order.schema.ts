import { z } from "zod";

/**
 * Zod schema for a single order row returned by the backend.
 * Validates at the API boundary so downstream code can trust field types.
 *
 * Use `OrderRowSchema.safeParse(raw)` — on failure, log a schema-mismatch
 * event via `sendClientLog` and return a safe default rather than throwing.
 */
export const OrderRowSchema = z.object({
  id: z.number().or(z.string().transform(Number)),
  status: z.string().default("PENDING"),
  totalAmount: z.number().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  franchiseId: z.string().nullable().optional(),
  franchiseName: z.string().optional(),
});

export type OrderRow = z.infer<typeof OrderRowSchema>;

export const PaginatedOrdersSchema = z.object({
  rows: z.array(OrderRowSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  totalPages: z.number().default(1),
});

export type PaginatedOrders = z.infer<typeof PaginatedOrdersSchema>;

/**
 * Parses a raw API response for an order list.
 * Returns a safe default on parse failure rather than throwing.
 */
export function safeParseOrders(
  raw: unknown,
  onMismatch?: (issues: z.ZodIssue[]) => void,
): PaginatedOrders {
  const result = PaginatedOrdersSchema.safeParse(raw);
  if (!result.success) {
    onMismatch?.(result.error.issues);
    return { rows: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
  return result.data;
}
