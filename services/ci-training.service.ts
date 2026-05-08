import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  withCredentials: true,
});

export interface CITrainingPackageItem {
  id: number;
  programId: number;
  name: string;
  code: string;
  description?: string | null;
  packageOrder: number;
  trainingLevelIds: number[];
  fee: number;
  currency?: string;
  isActive: boolean;
  purchaseStatus: "UNPAID" | "PENDING" | "PAID";
  isPurchased: boolean;
}

export interface CITrainingPurchaseInitiateResponse {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  purchaseId: number;
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

export async function listCIPackages(): Promise<CITrainingPackageItem[]> {
  const res = await api.get("/ci/training/packages");
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function initiateCITrainingPurchase(
  packageId: number,
): Promise<CITrainingPurchaseInitiateResponse> {
  const res = await api.post("/ci/training/purchase/initiate", { packageId });
  const payload = res.data?.data ?? res.data;
  const payment = payload?.payment ?? {};
  return {
    key: payload?.key ?? payment.key ?? payment.keyId,
    amount: payload?.amount ?? payment.amount,
    currency: payload?.currency ?? payment.currency ?? "INR",
    orderId: payload?.orderId ?? payment.orderId ?? payment.razorpayOrderId,
    purchaseId: payload?.purchaseId,
    paymentId: payload?.paymentId ?? payment.paymentId,
  };
}

export async function verifyCITrainingPayment(data: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  purchaseId: number;
}): Promise<void> {
  await api.post("/ci/billing/payment/verify", data);
}

export async function abandonCIPayment(data: {
  paymentId?: number;
  razorpayOrderId?: string;
  note?: string;
  purchaseId: number;
}): Promise<void> {
  await api.post("/ci/billing/payment/abandon", data);
}

export async function getCIProgress(): Promise<CIProgressItem[]> {
  const res = await api.get("/ci/training/progress");
  const payload = res.data?.data ?? res.data;
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
  const payload = res.data?.data ?? res.data;
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
  franchisee: { name: string; centreName: string; centreAddress: string } | null;
  instructor: { name: string; address: string | null; phone: string | null } | null;
  ciSignedAt?: string | null;
  franchiseeSignedAt?: string | null;
  ciSignatureUrl?: string | null;
  franchiseeSignatureUrl?: string | null;
  trainingPackages?: CITrainingPackageItem[];
}

export async function getCIAgreement(): Promise<CIAgreementRecord | null> {
  const res = await api.get("/ci/agreement");
  // Backend wraps all responses in { success, data } via ResponseInterceptor
  return res.data?.data ?? res.data ?? null;
}

export async function signCIAgreement(agreementId: number, signaturePath: string): Promise<void> {
  await api.post(`/ci/agreement/${agreementId}/sign`, { signaturePath });
}

export async function signCIAgreementFile(agreementId: number, file: File): Promise<void> {
  const form = new FormData();
  form.append("signature", file);
  await api.post(`/ci/agreement/${agreementId}/sign`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
