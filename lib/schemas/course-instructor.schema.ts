import { z } from "zod";

/**
 * Zod schema for a course instructor row from the backend.
 */
export const CourseInstructorRowSchema = z.object({
  id: z.number(),
  name: z.string().default(""),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.string().default("PENDING"),
  isActive: z.boolean().default(true),
  franchiseId: z.string().nullable().optional(),
  franchiseName: z.string().nullable().optional(),
  programId: z.number().nullable().optional(),
  levelId: z.number().nullable().optional(),
  trainingLevelId: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CourseInstructorRow = z.infer<typeof CourseInstructorRowSchema>;

export const PaginatedCourseInstructorsSchema = z.object({
  rows: z.array(CourseInstructorRowSchema).default([]),
  total: z.number().default(0),
  page: z.number().default(1),
  limit: z.number().default(20),
  totalPages: z.number().default(1),
});

export type PaginatedCourseInstructors = z.infer<
  typeof PaginatedCourseInstructorsSchema
>;

export function safeParseCourseInstructors(
  raw: unknown,
  onMismatch?: (issues: z.ZodIssue[]) => void,
): PaginatedCourseInstructors {
  const result = PaginatedCourseInstructorsSchema.safeParse(raw);
  if (!result.success) {
    onMismatch?.(result.error.issues);
    return { rows: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }
  return result.data;
}
