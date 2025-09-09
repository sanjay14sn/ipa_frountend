import useSWR, { mutate } from "swr";
import {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  requestStudentIds,
  issueIdCard,
  getAllRequestedIdDetails,
  getIssuedIdDetails,
  StudentData,
  RequestedIdDetailsByFranchise,
} from "@/services/student.service";

// SWR fetchers
const fetchAllStudents = async () => {
  const response = await getAllStudents();
  return response.result || [];
};

const fetchRequestedIdDetails = async () => {
  return await getAllRequestedIdDetails();
};

const fetchIssuedIdDetails = async () => {
  return await getIssuedIdDetails();
};

// SWR keys
export const STUDENTS_KEY = "/students/all";
export const REQUESTED_IDS_KEY = "/students/id-details";
export const ISSUED_IDS_KEY = "/students/issued-ids";

// Custom hooks
export function useStudents() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(STUDENTS_KEY, fetchAllStudents);

  return {
    students: data || [],
    isLoading,
    error,
    revalidate,
  };
}

export function useRequestedIdDetails() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(REQUESTED_IDS_KEY, fetchRequestedIdDetails);

  return {
    requestedIds: data || {},
    isLoading,
    error,
    revalidate,
  };
}

export function useIssuedIdDetails() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(ISSUED_IDS_KEY, fetchIssuedIdDetails);

  return {
    issuedIds: data || {},
    isLoading,
    error,
    revalidate,
  };
}

// Mutation functions with automatic revalidation
export async function createStudentWithRevalidation(
  studentData: Omit<
    StudentData,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >
) {
  const result = await createStudent(studentData);
  // Revalidate all related data
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function updateStudentWithRevalidation(
  studentId: number,
  studentData: Partial<StudentData>
) {
  const result = await updateStudent(studentId, studentData);
  // Revalidate all related data
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function deleteStudentWithRevalidation(studentId: number) {
  await deleteStudent(studentId);
  // Revalidate all related data
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
}

export async function requestStudentIdsWithRevalidation(studentIds: number[]) {
  const result = await requestStudentIds(studentIds);
  // Revalidate all related data
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function issueIdCardWithRevalidation(studentId: number) {
  const result = await issueIdCard(studentId);
  // Revalidate all related data
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}
