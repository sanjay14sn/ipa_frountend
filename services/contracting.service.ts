import { api } from "@/lib/axios";
import {
  unwrapData,
  normalizePaginatedResult,
  type PaginatedResult,
} from "@/lib/unwrap-api";
import type { CIAgreementRecord } from "@/services/ci-training.service";

export interface CIAgreementData {
  id: number;
  title: string;
  status: string;
  phase: "PENDING_CI_SIGNATURE" | "PENDING_FRANCHISEE_SIGNATURE" | "SIGNED" | "EXPIRED";
  instructorId: number;
  instructorName?: string;
  franchiseId: string;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
}

function statusToPhase(status: string): CIAgreementData["phase"] {
  const map: Record<string, CIAgreementData["phase"]> = {
    PendingCISignature: "PENDING_CI_SIGNATURE",
    PendingFranchiseeSignature: "PENDING_FRANCHISEE_SIGNATURE",
    Signed: "SIGNED",
    Expired: "EXPIRED",
    Void: "EXPIRED",
  };
  return map[status] ?? "PENDING_CI_SIGNATURE";
}

export async function listCIAgreementsForFranchisee(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<CIAgreementData>> {
  const res = await api.get("/contracting/ci-agreements", { params });
  const result = unwrapData<unknown>(res);
  const paginated = normalizePaginatedResult<any>(result);
  const rows: CIAgreementData[] = paginated.rows.map((r) => ({
    ...r,
    instructorId: r.courseInstructorId ?? r.instructorId,
    phase: statusToPhase(r.status),
  }));
  return { ...paginated, rows };
}

export async function getCIAgreementByIdForFranchisee(
  agreementId: number,
): Promise<CIAgreementRecord | null> {
  const res = await api.get(`/contracting/ci-agreements/${agreementId}`);
  return unwrapData<CIAgreementRecord | null>(res);
}

export async function signCIAgreementAsFranchisee(
  agreementId: number,
  signaturePath?: string,
): Promise<void> {
  await api.post(
    `/contracting/ci-agreements/${agreementId}/sign-franchisee`,
    signaturePath ? { signaturePath } : {},
  );
}

export async function signCIAgreementAsFranchiseeFile(
  agreementId: number,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append("signature", file);
  await api.post(
    `/contracting/ci-agreements/${agreementId}/sign-franchisee`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
}
