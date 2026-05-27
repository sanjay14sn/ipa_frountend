import { z } from "zod";

/**
 * Zod schema for a franchisee/franchise summary row from admin list endpoints.
 */
export const FranchiseeRowSchema = z.object({
  id: z.number().or(z.string()),
  name: z.string().default(""),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  franchiseId: z.string().nullable().optional(),
  franchiseName: z.string().nullable().optional(),
  franchiseStatus: z.string().default("Pending"),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export type FranchiseeRow = z.infer<typeof FranchiseeRowSchema>;

export const PaginatedFranchiseesSchema = z.object({
  rows: z.array(FranchiseeRowSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  totalPages: z.number().default(1),
});

export type PaginatedFranchisees = z.infer<typeof PaginatedFranchiseesSchema>;

export function safeParseFranchisees(
  raw: unknown,
  onMismatch?: (issues: z.ZodIssue[]) => void,
): PaginatedFranchisees {
  const result = PaginatedFranchiseesSchema.safeParse(raw);
  if (!result.success) {
    onMismatch?.(result.error.issues);
    return { rows: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
  return result.data;
}
