import { api } from "@/lib/axios";
import {
  unwrapData,
  normalizePaginatedResult,
  type PaginatedResult,
} from "@/lib/unwrap-api";
import {
  franchiseeProfileSignatureSrc,
  type AgreementStatus,
} from "@/services/agreement.service";
import type { CITrainingReceivable } from "@/services/ci-training.service";

// ─── CI agreement types (single source of truth) ─────────────────────────────

/**
 * Derived CI signing phase — computed server-side from signatories + status
 * and served on every CI agreement read. The FE never derives it locally.
 */
export type CIAgreementPhase =
  | "PENDING_CI_SIGNATURE"
  | "PENDING_FRANCHISEE_SIGNATURE"
  | "SIGNED"
  | "EXPIRED";

/**
 * CI agreement detail view (GET /ci/agreement, GET /admin/ci-agreement/:id,
 * GET /contracting/ci-agreements/:id). Mirrors the backend
 * `CIAgreementDetailView`.
 */
export interface CIAgreementRecord {
  id: number;
  title: string;
  /** Server-computed signing phase. */
  phase: CIAgreementPhase;
  /** Lifecycle status (UPPER_SNAKE). */
  status?: AgreementStatus;
  ciSigned?: boolean;
  franchiseeSigned?: boolean;
  tenure: number | null;
  expiresAt: string | null;
  dateOfSigning: string | null;
  ciShare: number | null;
  levelDurations: { l1: number; l2: number };
  franchisee: {
    name: string;
    centreName: string;
    centreAddress: string;
    phone?: string | null;
    mail?: string | null;
  } | null;
  instructor: { name: string; address: string | null; phone: string | null } | null;
  ciSignedAt?: string | null;
  franchiseeSignedAt?: string | null;
  ciSignatureUrl?: string | null;
  franchiseeSignatureUrl?: string | null;
  receivables?: CITrainingReceivable[];
  metadata?: Record<string, unknown> | null;
}

/** Franchisee countersign list row (GET /contracting/ci-agreements). */
export interface CIAgreementData {
  id: number;
  title: string;
  status: AgreementStatus;
  /** Server-computed phase — no client statusToPhase anymore. */
  phase: CIAgreementPhase;
  ciSigned?: boolean;
  franchiseeSigned?: boolean;
  instructorId: number;
  instructorName?: string | null;
  franchiseId: string;
  franchiseName?: string | null;
  ciShare?: number | null;
  tenure?: number | null;
  expiresAt?: string | null;
  createdAt: string;
}

// ─── CI portal: my agreement + signing ───────────────────────────────────────

export async function getCIAgreement(): Promise<CIAgreementRecord | null> {
  const res = await api.get("/ci/agreement");
  return unwrapData<CIAgreementRecord | null>(res) ?? null;
}

export interface CIESignaturePayload {
  svg: string;
  method: "drawn" | "typed";
  consentVersion: string;
}

export async function signCIAgreementWithESignature(
  agreementId: number,
  payload: CIESignaturePayload,
): Promise<void> {
  const blob = new Blob([payload.svg], { type: "image/svg+xml" });
  const file = new File([blob], "signature.svg", { type: "image/svg+xml" });
  const form = new FormData();
  form.append("signature", file);
  form.append("signatureMethod", payload.method);
  form.append("consentVersion", payload.consentVersion);
  await api.post(`/ci/agreement/${agreementId}/sign`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Update the CI's on-file signature without changing agreement state.
 *  Used for already-signed agreements where the signature file was never captured. */
export async function updateCIAgreementSignature(
  agreementId: number,
  payload: CIESignaturePayload,
): Promise<void> {
  const blob = new Blob([payload.svg], { type: "image/svg+xml" });
  const file = new File([blob], "signature.svg", { type: "image/svg+xml" });
  const form = new FormData();
  form.append("signature", file);
  form.append("signatureMethod", payload.method);
  form.append("consentVersion", payload.consentVersion);
  await api.patch(`/ci/agreement/${agreementId}/signature`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** Sign CI agreement using the CI's on-file signature (no upload needed). */
export async function signCIAgreementWithStored(agreementId: number): Promise<void> {
  const form = new FormData();
  form.append("useExisting", "true");
  await api.post(`/ci/agreement/${agreementId}/sign`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Resolves a raw stored CI signature path to a full URL.
 * The raw path is stored on the CI's signatory row (falling back to
 * `course_instructor.ciSignature`) and returned in
 * `CIAgreementRecord.ciSignatureUrl`.
 */
export function ciSignatureSrc(stored: string | null | undefined): string | null {
  return franchiseeProfileSignatureSrc(stored);
}

// ─── Franchisee countersign surface ──────────────────────────────────────────

export async function listCIAgreementsForFranchisee(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<CIAgreementData>> {
  const res = await api.get("/contracting/ci-agreements", { params });
  const result = unwrapData<unknown>(res);
  const paginated = normalizePaginatedResult<
    CIAgreementData & { courseInstructorId?: number }
  >(result);
  const rows: CIAgreementData[] = paginated.rows.map((r) => ({
    ...r,
    instructorId: r.courseInstructorId ?? r.instructorId,
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
  status: AgreementStatus;
  /** Server-computed phase. */
  phase: CIAgreementPhase;
  ciSigned: boolean;
  franchiseeSigned: boolean;
  ciSignedAt?: string | null;
  franchiseeSignedAt?: string | null;
  courseInstructorId?: number;
  instructorName?: string | null;
  instructorCode?: string | null;
  franchiseName?: string | null;
  franchiseId: string;
  franchiseeId?: number;
  ciShare?: number | null;
  tenure?: number | null;
  expiresAt?: string | null;
  createdAt: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function listCIAgreementsForAdmin(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResult<CIAgreementAdminRow>> {
  const res = await api.get("/admin/ci-agreement", { params });
  const result = unwrapData<unknown>(res);
  return normalizePaginatedResult<CIAgreementAdminRow>(result);
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

/**
 * Renews an EXPIRED CI agreement — no re-signing: a new agreement row is
 * created ACTIVE with the predecessor's signatories carried forward, and a
 * live predecessor flips to SUPERSEDED in the same transaction.
 */
export async function renewCIAgreement(
  agreementId: number,
  input: {
    tenure: number;
    effectiveDate: string;
    /** What happens to unpaid training-fee items on the predecessor's plan (default carry). */
    unpaidItemsPolicy?: "carry" | "cancel";
  },
): Promise<void> {
  await api.post(`/admin/ci-agreement/${agreementId}/renew`, input);
}
