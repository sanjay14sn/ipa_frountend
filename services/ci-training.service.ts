import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

/**
 * Settlement status of a CI training receivable item. Ids are RECEIVABLE ITEM
 * ids (they changed at the receivables migration — always list-then-pay).
 * Any of the unsettled statuses ('pending' | 'due' | 'scheduled') is payable
 * when it is the FIRST unsettled item; sequential order is enforced
 * server-side.
 */
export type CITrainingReceivableStatus =
  | "pending"
  | "due"
  | "scheduled"
  | "paid"
  | "waived";

export interface CITrainingReceivable {
  /** Receivable ITEM id — pass this to the pay endpoint. */
  id: number;
  receivableOrder: number;
  label: string;
  levelFrom: number;
  levelTo: number;
  /** Training levels covered by this receivable. */
  trainingLevelIds?: Array<{
    id: number;
    name: string;
    code: string;
    displayOrder: number;
  }>;
  /** The actual Razorpay payable for this item (incl. GST). */
  fee: number;
  status: CITrainingReceivableStatus;
  paidAt?: string | null;
  waivedAt?: string | null;
}

/** True when the item still needs settling (payable once it's first in line). */
export function isUnsettledCIReceivable(r: Pick<CITrainingReceivable, "status">): boolean {
  return r.status !== "paid" && r.status !== "waived";
}

/**
 * Payment-order shape returned by POST /ci/training/receivables/:id/pay —
 * the SAME shape every other checkout in the app uses.
 */
export interface CIReceivablePayResponse {
  razorpayOrderId: string;
  paymentId: number;
  amount: number;
  currency: string;
  keyId: string;
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

/** :receivableItemId = item id from the list (ids changed at migration). */
export async function initiateCIReceivablePayment(
  receivableItemId: number,
): Promise<CIReceivablePayResponse> {
  const res = await api.post(`/ci/training/receivables/${receivableItemId}/pay`);
  return unwrapData<CIReceivablePayResponse>(res);
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
        asNullableString(level.name) ??
        asNullableString(level.code) ??
        "Training level",
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
