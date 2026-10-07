import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import { buildStudentFeeHistoryFromConfig } from "@/lib/student-fee-history.utils";
import { mapStudentRow } from "@/services/student-list.service";
import type { FeeRuleType, SessionCountOption, CourseDurationOption } from "@/app/franchisee/fees/_components/fee-configuration-form";

/** Per-student fee snapshot for list / Fee Dues views. */
export interface StudentFeeListSummary {
  studentId: number;
  configured: boolean;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  totalPayable: number | null;
  planTotal?: number | null;
  monthlyInstallment?: number | null;
  feeRule?: string;
}

export type StudentFeeInstallmentStatus =
  | "PAID"
  | "UPCOMING"
  | "OVERDUE"
  | "SCHEDULED";

export interface StudentFeeHistoryRow {
  sequence: number;
  label: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  status: StudentFeeInstallmentStatus;
  paymentId?: number | null;
}

export interface StudentFeeHistoryResponse {
  student: { id: number; name: string; rollNo: string };
  configured: boolean;
  summary: {
    feeRule: string;
    planTotal: number;
    startDate: string;
    endDate: string;
    monthlyInstallment: number;
    nextDueDate: string | null;
    nextDueAmount: number | null;
  } | null;
  rows: StudentFeeHistoryRow[];
}

async function fetchStudentFeeHistoryFallback(
  studentId: number,
): Promise<StudentFeeHistoryResponse> {
  const [studentRes, config] = await Promise.all([
    api.get(`/student/${studentId}`),
    fetchStudentFeeConfiguration(studentId),
  ]);
  const student = mapStudentRow(
    unwrapData<Record<string, unknown>>(studentRes),
  );
  if (!config) {
    return {
      student: { id: student.id, name: student.name, rollNo: student.rollNo },
      configured: false,
      summary: null,
      rows: [],
    };
  }
  return buildStudentFeeHistoryFromConfig(
    { id: student.id, name: student.name, rollNo: student.rollNo },
    config,
  );
}

export async function fetchStudentFeeHistory(
  studentId: number,
): Promise<StudentFeeHistoryResponse> {
  try {
    const response = await api.get(`/student/${studentId}/fees/history`);
    return unwrapData<StudentFeeHistoryResponse>(response);
  } catch {
    return fetchStudentFeeHistoryFallback(studentId);
  }
}

export async function listStudentFeeSummaries(): Promise<StudentFeeListSummary[]> {
  const response = await api.get("/student/fees/summaries");
  const payload = unwrapData<StudentFeeListSummary[] | null>(response);
  return Array.isArray(payload) ? payload : [];
}

export interface StudentFeeConfigurationResponse {
  id: number;
  studentId: number;
  franchiseId: string;
  feeRule: FeeRuleType;
  registrationFee: number;
  courseFee: number;
  totalPayable: number;
  monthlyFee: number;
  startDate: string;
  endDate: string;
  isManualEndDate: boolean;
  durationOption: CourseDurationOption;
  durationMonths: number;
  sessionsOption: SessionCountOption;
  sessionsPerMonth: number;
  installmentDays: number;
  nextDueDate: string | null;
  nextDueAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveStudentFeeConfigurationPayload {
  feeRule: FeeRuleType;
  registrationFee: number;
  courseFee: number;
  startDate: string;
  endDate: string;
  isManualEndDate: boolean;
  durationOption: CourseDurationOption;
  durationMonths: number;
  sessionsOption: SessionCountOption;
  sessionsPerMonth: number;
  installmentDays?: number;
}

export async function fetchStudentFeeConfiguration(studentId: number) {
  const response = await api.get(`/student/${studentId}/fees`);
  return unwrapData<StudentFeeConfigurationResponse | null>(response);
}

export async function saveStudentFeeConfiguration(
  studentId: number,
  payload: SaveStudentFeeConfigurationPayload,
) {
  const response = await api.put(`/student/${studentId}/fees`, payload);
  return unwrapData<StudentFeeConfigurationResponse>(response);
}

export async function markStudentFeeAsPaid(studentId: number) {
  const response = await api.post(`/student/${studentId}/fees/pay`);
  return unwrapData<StudentFeeConfigurationResponse>(response);
}

export interface UpdateStudentFeeInstallmentPayload {
  amount: number;
  dueDate: string;
  /** ISO datetime when paid; null when not paid. */
  paidAt?: string | null;
}

export async function updateStudentFeeInstallment(
  studentId: number,
  sequence: number,
  payload: UpdateStudentFeeInstallmentPayload,
) {
  const response = await api.patch(
    `/student/${studentId}/fees/installments/${sequence}`,
    payload,
  );
  return unwrapData<StudentFeeHistoryResponse>(response);
}
