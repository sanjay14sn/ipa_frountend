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
  tenure?: number | null;
  expiresAt?: string | null;
  createdAt: string;
}

function statusToPhase(row: { status: string; ciSigned?: boolean }): CIAgreementData["phase"] {
  const { status, ciSigned } = row;
  if (status === "Void" || status === "Expired") return "EXPIRED";
  if (status === "Valid" || status === "Suspended") return "SIGNED";
  if (status === "Approved" && ciSigned) return "PENDING_FRANCHISEE_SIGNATURE";
  return "PENDING_CI_SIGNATURE";
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
    phase: statusToPhase(r),
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

// ─── Admin CI-agreement service functions ───────────────────────────────────

export interface CIAgreementAdminRow {
  id: number;
  title: string;
  status: string;
  phase: CIAgreementData["phase"];
  ciSigned: boolean;
  franchiseeSigned: boolean;
  instructorName?: string;
  franchiseName?: string;
  centreName?: string;
  franchiseId: string;
  tenure?: number | null;
  expiresAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export async function listCIAgreementsForAdmin(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<CIAgreementAdminRow>> {
  const res = await api.get("/admin/ci-agreement", { params });
  const result = unwrapData<unknown>(res);
  const paginated = normalizePaginatedResult<any>(result);
  const rows: CIAgreementAdminRow[] = paginated.rows.map((r: any) => ({
    ...r,
    phase: statusToPhase(r),
  }));
  return { ...paginated, rows };
}

export async function getCIAgreementForAdmin(
  agreementId: number,
): Promise<CIAgreementAdminRow | null> {
  const res = await api.get(`/admin/ci-agreement/${agreementId}`);
  return unwrapData<CIAgreementAdminRow | null>(res);
}

export async function suspendCIAgreement(
  agreementId: number,
  reason?: string,
): Promise<void> {
  await api.post(`/admin/ci-agreement/${agreementId}/suspend`, { reason });
}

export async function reactivateCIAgreement(agreementId: number): Promise<void> {
  await api.post(`/admin/ci-agreement/${agreementId}/reactivate`);
}

export async function voidCIAgreement(
  agreementId: number,
  reason?: string,
): Promise<void> {
  await api.post(`/admin/ci-agreement/${agreementId}/void`, { reason });
}
