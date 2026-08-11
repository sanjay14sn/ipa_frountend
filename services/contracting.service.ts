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
 * One agreement in the CI's own chain (GET /ci/agreement `history`), oldest
 * first — feeds the lifecycle summary cards on the CI portal.
 */
export interface CIAgreementHistoryEntry {
  id: number;
  kind: "CI";
  origin: "NEW" | "RENEWAL";
  status: AgreementStatus;
  dateOfSigning: string | null;
  activatedAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  tenure: number | null;
}

/**
 * CI agreement detail view (GET /ci/agreement, GET /admin/ci-agreement/:id,
 * GET /contracting/ci-agreements/:id). Mirrors the backend
 * `CIAgreementDetailView`.
 */
export interface CIAgreementRecord {
  id: number;
  title: string;
  /** Multi-franchise list reads only (GET /ci/agreements). */
  franchiseId?: string;
  isHandler?: boolean;
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
  /** Instructor's own read only: full agreement chain, oldest first. */
  history?: CIAgreementHistoryEntry[];
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

const CI_GATE_PHASE_RANK: Record<string, number> = {
  SIGNED: 3,
  PENDING_FRANCHISEE_SIGNATURE: 2,
  PENDING_CI_SIGNATURE: 1,
  EXPIRED: 0,
};

/**
 * Portal gate phase over the CI's agreement LIST (pure — unit-tested).
 * Single agreement → its phase verbatim (exact parity with the pre-multi-
 * franchise gate). Several → the most-advanced non-void phase, so a CI with
 * one signed agreement keeps full portal access while a newly attached
 * franchise's agreement waits for signatures.
 */
export function deriveCIGatePhase(
  agreements: CIAgreementRecord[],
): CIAgreementPhase | null {
  if (!agreements.length) return null;
  if (agreements.length === 1) return agreements[0].phase ?? null;
  const nonVoid = agreements.filter((a) => a.status !== "VOID");
  const pool = nonVoid.length ? nonVoid : agreements;
  return pool.reduce((best, a) =>
    (CI_GATE_PHASE_RANK[a.phase] ?? -1) > (CI_GATE_PHASE_RANK[best.phase] ?? -1)
      ? a
      : best,
  ).phase;
}

/** Agreements still waiting on the CI's own signature (non-void). */
export function countPendingCISignatures(
  agreements: CIAgreementRecord[],
): number {
  return agreements.filter(
    (a) => a.status !== "VOID" && a.phase === "PENDING_CI_SIGNATURE",
  ).length;
}

/**
 * Multi-franchise CI: every agreement the CI holds, one detail view per
 * franchise (handler first, each with its own renewal chain as `history`).
 * Falls back to the singular GET /ci/agreement on older backends (404), so
 * the multi-agreement UI can ship before the endpoint does.
 */
export async function listMyCIAgreements(): Promise<CIAgreementRecord[]> {
  try {
    const res = await api.get("/ci/agreements");
    return unwrapData<CIAgreementRecord[]>(res) ?? [];
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    if (status !== 404) throw error;
    const one = await getCIAgreement();
    return one ? [one] : [];
  }
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
  /** Scope to the active franchise — multi-franchise owners otherwise see every franchise's CI agreements blended. */
  franchiseId?: string;
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
  franchiseId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}): Promise<PaginatedResult<CIAgreementAdminRow>> {
  const res = await api.get("/admin/ci-agreement", { params });
  const result = unwrapData<unknown>(res);
  return normalizePaginatedResult<CIAgreementAdminRow>(result);
}

/** Admin detail view of one CI agreement by agreement id (null if not a CI agreement). */
export async function getCIAgreementForAdmin(
  agreementId: number,
): Promise<CIAgreementRecord | null> {
  const res = await api.get(`/admin/ci-agreement/${agreementId}`);
  return unwrapData<CIAgreementRecord | null>(res);
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
