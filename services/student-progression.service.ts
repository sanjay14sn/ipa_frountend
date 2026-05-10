import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export type StudentLevelProgressionStatus =
  | 'ENROLLED'
  | 'UNDERGOING'
  | 'COMPLETED'
  | 'FAILED';

export type CertificateStatus = 'NONE' | 'PENDING' | 'ISSUED' | 'REJECTED';

export interface StudentLevelProgression {
  id: number;
  studentId: number;
  levelId: number;
  status: StudentLevelProgressionStatus;
  marks: number | null;
  theoryMarks: number | null;
  totalMarks: number | null;
  instructorId: number | null;
  materialsOrdered: boolean;
  materialsOrderedAt: string | null;
  completedAt: string | null;
  certificateStatus: CertificateStatus;
  certificateRequestDate: string | null;
  certificateIssuedAt: string | null;
  certificatePdfPath: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProgressionDto {
  status?: StudentLevelProgressionStatus;
  marks?: number | null;
  theoryMarks?: number | null;
}

export async function getStudentProgressions(
  studentId: number,
): Promise<StudentLevelProgression[]> {
  const response = await api.get(`/student/${studentId}/progression`);
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? (data as StudentLevelProgression[]) : [];
}

export async function updateStudentProgression(
  studentId: number,
  progressionId: number,
  dto: UpdateProgressionDto,
): Promise<StudentLevelProgression> {
  const response = await api.patch(
    `/student/${studentId}/progression/${progressionId}`,
    dto,
  );
  return unwrapData<StudentLevelProgression>(response);
}
