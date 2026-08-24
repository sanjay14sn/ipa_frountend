import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { FeeRuleType, SessionCountOption, CourseDurationOption } from "@/app/franchisee/fees/_components/fee-configuration-form";

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
  return unwrapData<StudentFeeConfigurationResponse | null>(response.data);
}

export async function saveStudentFeeConfiguration(
  studentId: number,
  payload: SaveStudentFeeConfigurationPayload,
) {
  const response = await api.put(`/student/${studentId}/fees`, payload);
  return unwrapData<StudentFeeConfigurationResponse>(response.data);
}
