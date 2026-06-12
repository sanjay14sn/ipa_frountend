import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { CITrainingReceivable } from "@/services/ci-training.service";

export interface CITrainingSession {
  id: number;
  region: string;
  trainingLevelId: number;
  trainingLevelName?: string;
  sessionDate: string;
  venue?: string;
  maxCapacity?: number;
  status: 'OPEN' | 'COMPLETED';
  assignmentCount?: number;
  waitingCount?: number;
}

export interface CITrainingAssignment {
  id: number;
  instructorId: number;
  instructorName?: string;
  instructorCode?: string;
  franchiseName?: string;
  sessionId: number | null;
  status: string;
  theoryMarks?: number | null;
  practicalMarks?: number | null;
  completedAt?: string | null;
}

export interface WaitingInstructor {
  instructorId: number;
  instructorName?: string;
  instructorCode?: string;
  franchiseName?: string;
  region: string;
  trainingLevelId: number;
}

export interface InstructorProgress {
  instructorId: number;
  levels: {
    trainingLevelId: number;
    trainingLevelName?: string;
    status: string;
    sessionDate?: string | null;
    theoryMarks?: number | null;
    practicalMarks?: number | null;
  }[];
}

export interface CreateSessionInput {
  programId?: number;
  region: string;
  trainingLevelId: number;
  sessionDate: string;
  notes?: string;
}

export interface RecordMarksInput {
  theoryMarks: number;
  practicalMarks?: number;
  notes?: string;
}

function buildCiTrainingQueryParams(params?: {
  region?: string;
  trainingLevelId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;   // ADD
}) {
  const query: Record<string, string | number> = {};

  if (typeof params?.region === "string") {
    const region = params.region.trim();
    if (region.length > 0) query.region = region;
  }

  if (Number.isInteger(params?.trainingLevelId)) {
    query.trainingLevelId = Number(params?.trainingLevelId);
  }

  if (typeof params?.fromDate === "string" && params.fromDate.trim().length > 0) {
    query.fromDate = params.fromDate.trim();
  }

  if (typeof params?.toDate === "string" && params.toDate.trim().length > 0) {
    query.toDate = params.toDate.trim();
  }

  if (typeof params?.search === "string") {   // ADD THIS BLOCK
    const s = params.search.trim();
    if (s.length > 0) query.search = s;
  }

  return query;
}

export async function listSessions(params?: {
  region?: string;
  trainingLevelId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;   // ADD
}): Promise<CITrainingSession[]> {
  const res = await api.get("/admin/ci-training/sessions", {
    params: buildCiTrainingQueryParams(params),
  });
  const payload = res.data.result;
  return Array.isArray(payload) ? payload : [];
}

export async function createSession(input: CreateSessionInput): Promise<CITrainingSession> {
  const res = await api.post("/admin/ci-training/session", {
    programId: input.programId,
    region: input.region,
    trainingLevelId: input.trainingLevelId,
    sessionDate: input.sessionDate,
    notes: input.notes,
  });
  return res.data.result;
}

export async function listAssignmentsBySession(sessionId: number): Promise<CITrainingAssignment[]> {
  const res = await api.get(`/admin/ci-training/sessions/${sessionId}/assignments`);
  const payload = res.data.result;
  return Array.isArray(payload) ? payload : [];
}

export async function listWaiting(params?: {
  region?: string;
  trainingLevelId?: number;
  search?: string;   // ADD
}): Promise<WaitingInstructor[]> {
  const res = await api.get("/admin/ci-training/waiting", {
    params: buildCiTrainingQueryParams(params),
  });
  const payload = res.data.result;
  return Array.isArray(payload) ? payload : [];
}

async function getInstructorProgress(instructorId: number): Promise<InstructorProgress> {
  const res = await api.get(`/admin/ci-training/instructors/${instructorId}/progress`);
  return res.data.result;
}

export async function reassignAssignment(
  assignmentId: number,
  targetSessionId: number,
): Promise<void> {
  await api.post(`/admin/ci-training/assignment/${assignmentId}/reassign`, { targetSessionId });
}

export async function completeAssignment(
  assignmentId: number,
  input: RecordMarksInput,
): Promise<void> {
  await api.patch(`/admin/ci-training/assignment/${assignmentId}/complete`, input);
}

async function completeSession(sessionId: number): Promise<CITrainingSession> {
  const res = await api.patch(`/admin/ci-training/session/${sessionId}/complete`);
  return unwrapData<CITrainingSession>(res);
}

export async function rescheduleSession(sessionId: number, sessionDate: string): Promise<CITrainingSession> {
  const res = await api.patch(`/admin/ci-training/session/${sessionId}`, { sessionDate });
  return res.data.result;
}

/**
 * Force-set how far an instructor has completed. Every *paid* level with
 * displayOrder <= completedThrough is marked completed and its receivables waived.
 */
export async function setInstructorCompletionState(
  instructorId: number,
  completedThrough: number,
): Promise<void> {
  await api.patch(
    `/admin/ci-training/instructors/${instructorId}/completion-state`,
    { completedThrough },
  );
}

export async function listInstructorReceivables(
  instructorId: number,
): Promise<CITrainingReceivable[]> {
  const res = await api.get(`/admin/ci-training/instructors/${instructorId}/receivables`);
  const payload = res.data.result;
  return Array.isArray(payload) ? payload : [];
}

export interface CreateCIReceivableInput {
  levelFrom: number;
  levelTo: number;
  fee: number;
  label?: string;
}

export async function createCIReceivablePlan(
  instructorId: number,
  receivables: CreateCIReceivableInput[],
): Promise<void> {
  await api.post(`/admin/ci-training/instructors/${instructorId}/receivables`, {
    receivables,
  });
}

export async function waiveCIReceivable(
  receivableId: number,
  reason: string,
): Promise<void> {
  await api.post(`/admin/ci-training/receivables/${receivableId}/waive`, { reason });
}
