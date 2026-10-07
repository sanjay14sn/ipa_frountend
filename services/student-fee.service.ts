import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import { buildStudentFeeHistoryFromConfig } from "@/lib/student-fee-history.utils";
import {
  getAllStudents,
  mapStudentRow,
  type StudentData,
} from "@/services/student-list.service";
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

function isFeeSummariesEndpointMissing(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status === 404) return true;
  const message = String(
    (error.response?.data as { message?: string } | undefined)?.message ?? "",
  );
  return message.includes("/student/fees/summaries");
}

function toListSummaryFromConfig(
  studentId: number,
  config: StudentFeeConfigurationResponse | null,
  embedded?: StudentData["feeConfiguration"],
): StudentFeeListSummary {
  if (embedded?.configured) {
    return {
      studentId,
      configured: true,
      nextDueDate: embedded.nextDueDate ?? null,
      nextDueAmount: embedded.nextDueAmount ?? null,
      totalPayable: embedded.totalPayable ?? null,
      planTotal: embedded.planTotal ?? null,
      monthlyInstallment: embedded.monthlyInstallment ?? null,
      feeRule: embedded.feeRule,
    };
  }
  if (!config) {
    return {
      studentId,
      configured: false,
      nextDueDate: null,
      nextDueAmount: null,
      totalPayable: null,
    };
  }
  const registrationFee = Number(config.registrationFee);
  const courseFee = Number(config.courseFee);
  return {
    studentId: config.studentId,
    configured: true,
    nextDueDate: config.nextDueDate,
    nextDueAmount:
      config.nextDueAmount != null ? Number(config.nextDueAmount) : null,
    totalPayable: Number(config.totalPayable),
    planTotal: registrationFee + courseFee,
    monthlyInstallment: Number(config.monthlyFee),
    feeRule: config.feeRule,
  };
}

/** Older backends expose per-student `/student/:id/fees` but not the bulk summaries route. */
async function listStudentFeeSummariesLegacy(): Promise<StudentFeeListSummary[]> {
  const { result: students } = await getAllStudents({ status: "active" });
  return Promise.all(
    students.map(async (student) => {
      const embedded = student.feeConfiguration;
      if (embedded?.configured) {
        return toListSummaryFromConfig(student.id, null, embedded);
      }
      try {
        const config = await fetchStudentFeeConfiguration(student.id);
        return toListSummaryFromConfig(student.id, config, embedded);
      } catch {
        return toListSummaryFromConfig(student.id, null, embedded);
      }
    }),
  );
}

export async function listStudentFeeSummaries(): Promise<StudentFeeListSummary[]> {
  try {
    const response = await api.get("/student/fees/summaries");
    const payload = unwrapData<StudentFeeListSummary[] | null>(response);
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    if (!isFeeSummariesEndpointMissing(error)) throw error;
    return listStudentFeeSummariesLegacy();
  }
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
