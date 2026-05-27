import { z } from "zod";

/**
 * Zod schema for an inventory item from the backend.
 */
export const InventoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string().optional(),
  description: z.string().nullable().optional(),
  quantity: z.number().default(0),
  availableQuantity: z.number().default(0),
  unitCost: z.number().nullable().optional(),
  status: z.string().default("ACTIVE"),
  category: z.string().nullable().optional(),
  programId: z.number().nullable().optional(),
  levelId: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const PaginatedInventorySchema = z.object({
  rows: z.array(InventoryItemSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  totalPages: z.number().default(1),
});

export type PaginatedInventory = z.infer<typeof PaginatedInventorySchema>;

export function safeParseInventory(
  raw: unknown,
  onMismatch?: (issues: z.ZodIssue[]) => void,
): PaginatedInventory {
  const result = PaginatedInventorySchema.safeParse(raw);
  if (!result.success) {
    onMismatch?.(result.error.issues);
    return { rows: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
  return result.data;
}
