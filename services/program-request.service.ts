import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface ProgramRequestItem {
  id: number;
  franchiseId: string;
  programId: number;
  franchiseeId: number;
  status: 'Requested' | 'TermsSet' | 'PendingSignature' | 'Active' | 'Rejected' | 'Cancelled';
  agreementId: number | null;
  requestedAt: string;
  approvedAt: string | null;
  activatedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  franchise?: { id: string; name: string; city?: string };
  program?: { id: number; name: string };
  franchisee?: { id: number; name: string; mail?: string; phone?: string };
}

export async function listProgramRequests(): Promise<ProgramRequestItem[]> {
  const res = await api.get('/franchisee/program-requests');
  const data = unwrapData<ProgramRequestItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function requestPrograms(franchiseId: string, programIds: number[]): Promise<void> {
  // One API call per programId (backend takes one programId per call)
  await Promise.all(
    programIds.map((programId) =>
      api.post('/franchisee/program-requests', { franchiseId, programId })
    )
  );
}

export async function cancelProgramRequest(id: number): Promise<void> {
  await api.post(`/franchisee/program-requests/${id}/cancel`);
}

export async function listProgramRequestsForAdmin(params?: {
  status?: string;
  franchiseId?: string;
}): Promise<ProgramRequestItem[]> {
  const res = await api.get('/admin/program-requests', { params });
  const data = unwrapData<ProgramRequestItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function approveProgramRequestAdmin(id: number, payload: unknown): Promise<void> {
  await api.post(`/admin/program-requests/${id}/approve`, payload);
}

export async function rejectProgramRequestAdmin(id: number, reason: string): Promise<void> {
  await api.post(`/admin/program-requests/${id}/reject`, { reason });
}
