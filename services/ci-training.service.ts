import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import { franchiseeProfileSignatureSrc } from "./agreement.service";

export interface CITrainingReceivable {
  id: number;
  receivableOrder: number;
  label: string;
  levelFrom: number;
  levelTo: number;
  fee: number;
  status: "pending" | "paid" | "waived";
  paidAt?: string | null;
  waivedAt?: string | null;
}

export interface CIReceivablePayResponse {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentId?: number;
}

export interface CIProgressItem {
  id?: number;
  trainingLevelId: number;
  trainingLevelName: string;
  trainingLevelCode?: string | null;
  displayOrder?: number | null;
  status: string;
  paid?: boolean;
  isCompleted?: boolean;
  isActive?: boolean;
  marks?: number | null;
  sessionDate?: string | null;
  theoryMarks?: number | null;
  practicalMarks?: number | null;
  completedAt?: string | null;
}

export interface CIUpcomingSession {
  sessionId: number;
  trainingLevelId: number;
  trainingLevelName?: string;
  region: string;
  sessionDate: string;
  venue?: string | null;
  assignmentStatus: string;
}

export async function listCIReceivables(): Promise<CITrainingReceivable[]> {
  const res = await api.get("/ci/training/receivables");
  const payload = unwrapData<unknown>(res);
  return Array.isArray(payload) ? payload : [];
}

export async function initiateCIReceivablePayment(
  receivableId: number,
): Promise<CIReceivablePayResponse> {
  const res = await api.post(`/ci/training/receivables/${receivableId}/pay`);
  const payload = asRecord(unwrapData<unknown>(res));
  const payment = asRecord(payload.payment);
  return {
    key: String(payload.key ?? payload.keyId ?? payment.key ?? payment.keyId ?? ""),
    amount: Number(payload.amount ?? payment.amount),
    currency: String(payload.currency ?? payment.currency ?? "INR"),
    orderId: String(payload.orderId ?? payload.razorpayOrderId ?? payment.orderId ?? payment.razorpayOrderId ?? ""),
    paymentId: asNumber(payload.paymentId ?? payment.paymentId),
  };
}

export async function verifyCIReceivablePayment(data: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<void> {
  await api.post("/ci/billing/payment/verify", data);
}

export async function abandonCIReceivablePayment(data: {
  paymentId?: number;
  razorpayOrderId?: string;
  note?: string;
}): Promise<void> {
  await api.post("/ci/billing/payment/abandon", data);
}

export async function getCIProgress(): Promise<CIProgressItem[]> {
  const res = await api.get("/ci/training/progress");
  const payload = unwrapData<unknown>(res);
  return normalizeCIProgressResponse(payload);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  return asNumber(value) ?? null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function deriveProgressStatus(
  training: Record<string, unknown>,
  assignment: Record<string, unknown>,
): string {
  const assignmentStatus = asNullableString(assignment.status);
  if (assignmentStatus) return assignmentStatus;
  if (training.isCompleted === true) return "COMPLETED";
  if (training.isActive === true) return "ACTIVE";
  if (training.paid === true) return "PAID";
  return "UNPAID";
}

export function normalizeCIProgressResponse(payload: unknown): CIProgressItem[] {
  if (Array.isArray(payload)) return payload as CIProgressItem[];

  const root = asRecord(payload);
  const trainings = Array.isArray(root.trainings) ? root.trainings : [];

  return trainings.map((raw) => {
    const training = asRecord(raw);
    const level = asRecord(training.trainingLevel);
    const assignment = asRecord(training.assignment);
    const trainingLevelId =
      asNumber(training.trainingLevelId) ?? asNumber(level.id) ?? 0;

    return {
      id: asNumber(training.id),
      trainingLevelId,
      trainingLevelName:
        asNullableString(level.name) ?? `Level ${trainingLevelId}`,
      trainingLevelCode: asNullableString(level.code),
      displayOrder:
        asNullableNumber(training.displayOrder) ??
        asNullableNumber(level.displayOrder),
      status: deriveProgressStatus(training, assignment),
      paid: training.paid === true,
      isCompleted: training.isCompleted === true,
      isActive: training.isActive === true,
      marks: asNullableNumber(training.marks),
      sessionDate:
        asNullableString(assignment.sessionDate) ??
        asNullableString(assignment.assignedAt) ??
        asNullableString(assignment.attemptedAt),
      theoryMarks: asNullableNumber(assignment.theoryMarks),
      practicalMarks: asNullableNumber(assignment.practicalMarks),
      completedAt:
        asNullableString(assignment.completedAt) ??
        asNullableString(training.completedAt),
    };
  });
}

export async function getCIUpcomingSessions(): Promise<CIUpcomingSession[]> {
  const res = await api.get("/ci/training/upcoming");
  const payload = unwrapData<unknown>(res);
  return Array.isArray(payload) ? payload : [];
}

export type CIAgreementPhase =
  | "PENDING_CI_SIGNATURE"
  | "PENDING_FRANCHISEE_SIGNATURE"
  | "SIGNED"
  | "EXPIRED";

export interface CIAgreementRecord {
  id: number;
  title: string;
  phase: CIAgreementPhase;
  validFrom: string | null;
  validUntil: string | null;
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
}

export async function getCIAgreement(): Promise<CIAgreementRecord | null> {
  const res = await api.get("/ci/agreement");
  return unwrapData<CIAgreementRecord | null>(res) ?? null;
}

export async function signCIAgreement(agreementId: number, signaturePath: string): Promise<void> {
  await api.post(`/ci/agreement/${agreementId}/sign`, { signaturePath });
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
  await api.patch(`/ci/agreement/${agreementId}/signature`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Resolves a raw stored CI signature path to a full URL.
 * The raw path is stored on `course_instructor.ciSignature` and
 * returned in `CIAgreementRecord.ciSignatureUrl`.
 */
export function ciSignatureSrc(stored: string | null | undefined): string | null {
  return franchiseeProfileSignatureSrc(stored);
}

/** Sign CI agreement using the CI's on-file signature (no upload needed). */
export async function signCIAgreementWithStored(agreementId: number): Promise<void> {
  const form = new FormData();
  form.append("useExisting", "true");
  await api.post(`/ci/agreement/${agreementId}/sign`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
