import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  withCredentials: true,
});

export interface FranchiseeTrainingSession {
  id: number;
  region: string;
  trainingLevelId: number;
  trainingLevelName?: string | null;
  sessionDate: string;
  notes?: string | null;
  status: "OPEN" | "COMPLETED";
  isActive: boolean;
}

export interface WaitingCI {
  assignmentId: number;
  instructorId: number;
  instructorName: string | null;
  instructorCode: string | null;
  franchiseName: string | null;
  region: string;
  trainingLevelId: number;
}

/** CIs already linked to a training session (persisted). */
export interface SessionAssignedCI extends WaitingCI {
  status: "ASSIGNED" | "COMPLETED";
}

export interface BulkAssignResult {
  assigned: number;
  skipped: number;
}

export async function listFranchiseeTrainingSessions(params?: {
  trainingLevelId?: number;
  programId?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<FranchiseeTrainingSession[]> {
  const query: Record<string, string | number> = {};
  if (params?.trainingLevelId) query.trainingLevelId = params.trainingLevelId;
  if (params?.programId) query.programId = params.programId;
  if (params?.fromDate) query.fromDate = params.fromDate;
  if (params?.toDate) query.toDate = params.toDate;

  const res = await api.get("/course-instructor/ci-training/sessions", {
    params: query,
  });
  const payload = res.data?.data ?? res.data?.result ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function listWaitingForSession(sessionId: number): Promise<WaitingCI[]> {
  const res = await api.get(`/course-instructor/ci-training/sessions/${sessionId}/waiting`);
  const payload = res.data?.data ?? res.data?.result ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function listSessionAssignments(
  sessionId: number,
): Promise<SessionAssignedCI[]> {
  const res = await api.get(
    `/course-instructor/ci-training/sessions/${sessionId}/assignments`,
  );
  const payload = res.data?.data ?? res.data?.result ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function bulkAssignToSession(
  sessionId: number,
  assignmentIds: number[],
): Promise<BulkAssignResult> {
  const res = await api.post(
    `/course-instructor/ci-training/sessions/${sessionId}/bulk-assign`,
    { assignmentIds },
  );
  const payload = res.data?.data ?? res.data;
  return { assigned: payload?.assigned ?? 0, skipped: payload?.skipped ?? 0 };
}
