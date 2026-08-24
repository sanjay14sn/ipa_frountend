import { api } from "@/lib/axios";
import { unwrapData, unwrapList } from "@/lib/unwrap-api";

export interface LearningBookChapter {
  id?: number;
  title: string;
  pageFrom: number;
  pageTo: number;
  sortOrder?: number;
}

export interface LearningBook {
  id: number;
  title: string;
  programId: number;
  programName?: string | null;
  programCode?: string | null;
  levelId: number;
  levelName?: string | null;
  levelCode?: string | null;
  subject: string;
  totalPages: number;
  description?: string | null;
  isActive: boolean;
  chapters: LearningBookChapter[];
}

export interface LearningBatch {
  id: number;
  franchiseId: string;
  name: string;
  levelId?: number | null;
  levelName?: string | null;
  coordinatorInstructorId?: number | null;
  isActive: boolean;
  studentIds: number[];
  students: Array<{ id: number; name: string; rollNo: string; levelId: number }>;
  studentCount: number;
}

export interface LearningAssignment {
  id: number;
  franchiseId: string;
  bookId: number;
  bookTitle?: string | null;
  bookSubject?: string | null;
  bookTotalPages?: number | null;
  chapterId?: number | null;
  pageFrom: number;
  pageTo: number;
  targetType: "INDIVIDUAL" | "BATCH";
  batchId?: number | null;
  assignedDate: string;
  dueDate: string;
  instructions?: string | null;
  priority: "NORMAL" | "IMPORTANT";
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  completionSummary: string;
  students: Array<{
    id: number;
    studentId: number;
    studentName?: string | null;
    studentRollNo?: string | null;
    status: "PENDING" | "COMPLETED";
    completedAt?: string | null;
  }>;
}

export interface LearningProgressRow {
  assignmentId: number;
  franchiseId?: string;
  studentId: number;
  studentName?: string | null;
  studentRollNo?: string | null;
  bookTitle?: string | null;
  pages: string;
  assignedDate: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED";
  assignmentStatus: string;
  priority: string;
}

export async function fetchAdminBooks(includeInactive = true) {
  const response = await api.get("/learning/admin/books", {
    params: { includeInactive: includeInactive ? "true" : "false" },
  });
  return unwrapList<LearningBook>(response);
}

export async function createAdminBook(payload: Partial<LearningBook>) {
  const response = await api.post("/learning/admin/books", payload);
  return unwrapData<LearningBook>(response);
}

export async function updateAdminBook(id: number, payload: Partial<LearningBook>) {
  const response = await api.put(`/learning/admin/books/${id}`, payload);
  return unwrapData<LearningBook>(response);
}

export async function deactivateAdminBook(id: number) {
  const response = await api.patch(`/learning/admin/books/${id}/deactivate`);
  return unwrapData(response);
}

export async function activateAdminBook(id: number) {
  const response = await api.patch(`/learning/admin/books/${id}/activate`);
  return unwrapData(response);
}

export async function deleteAdminBook(id: number) {
  const response = await api.delete(`/learning/admin/books/${id}`);
  return unwrapData(response);
}

export async function fetchAdminLearningProgress(params?: {
  franchiseId?: string;
  status?: string;
}) {
  const response = await api.get("/learning/admin/books/progress", { params });
  return unwrapList<LearningProgressRow>(response);
}

export async function fetchFranchiseBooks(params?: {
  levelId?: number;
  search?: string;
}) {
  const response = await api.get("/learning/franchise/books", { params });
  return unwrapList<LearningBook>(response);
}

export async function fetchFranchiseBatches(activeOnly = false) {
  const response = await api.get("/learning/franchise/batches", {
    params: { activeOnly: activeOnly ? "true" : "false" },
  });
  return unwrapList<LearningBatch>(response);
}

export async function createFranchiseBatch(payload: {
  name: string;
  levelId?: number;
  coordinatorInstructorId?: number;
  studentIds: number[];
}) {
  const response = await api.post("/learning/franchise/batches", payload);
  return unwrapData<LearningBatch>(response);
}

export async function updateFranchiseBatch(
  id: number,
  payload: {
    name: string;
    levelId?: number;
    coordinatorInstructorId?: number;
    studentIds: number[];
  },
) {
  const response = await api.put(`/learning/franchise/batches/${id}`, payload);
  return unwrapData<LearningBatch>(response);
}

export async function deactivateFranchiseBatch(id: number) {
  const response = await api.patch(`/learning/franchise/batches/${id}/deactivate`);
  return unwrapData(response);
}

export async function deleteFranchiseBatch(id: number) {
  const response = await api.delete(`/learning/franchise/batches/${id}`);
  return unwrapData(response);
}

export async function fetchFranchiseAssignments(params?: {
  status?: string;
  bookId?: number;
  studentId?: number;
  batchId?: number;
}) {
  const response = await api.get("/learning/franchise/assignments", { params });
  return unwrapList<LearningAssignment>(response);
}

export async function createFranchiseAssignment(payload: {
  bookId: number;
  chapterId?: number;
  pageFrom: number;
  pageTo: number;
  targetType: "INDIVIDUAL" | "BATCH";
  batchId?: number;
  studentIds: number[];
  assignedDate: string;
  dueDate: string;
  instructions?: string;
  priority?: "NORMAL" | "IMPORTANT";
}) {
  const response = await api.post("/learning/franchise/assignments", payload);
  return unwrapData<LearningAssignment>(response);
}

export async function cancelFranchiseAssignment(id: number) {
  const response = await api.patch(`/learning/franchise/assignments/${id}/cancel`);
  return unwrapData<LearningAssignment>(response);
}

export async function deleteFranchiseAssignment(id: number) {
  const response = await api.delete(`/learning/franchise/assignments/${id}`);
  return unwrapData(response);
}

export async function markAssignmentStudentComplete(
  assignmentId: number,
  studentId: number,
) {
  const response = await api.patch(
    `/learning/franchise/assignments/${assignmentId}/students/${studentId}/complete`,
  );
  return unwrapData<LearningAssignment>(response);
}

export async function fetchFranchiseLearningProgress(studentId?: number) {
  const response = await api.get("/learning/franchise/assignments/progress", {
    params: studentId ? { studentId } : undefined,
  });
  return unwrapList<LearningProgressRow>(response);
}
