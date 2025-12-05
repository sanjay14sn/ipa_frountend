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
  getAllRequestedCertificateDetails,
  getIssuedCertificateDetails,
  issueCertificate,
  getEligibleStudents,
  getAllAdminCertificateRequests,
  approveCertificateRequest,
  rejectCertificateRequest,
  getFranchiseeCertificates,
  StudentData,
  RequestedIdDetailsByFranchise,
  RequestedCertificateDetailsByFranchise,
  EligibleStudent,
  AdminCertificateRequest,
  AdminCertificateRequestsByFranchise,
  FranchiseeCertificate,
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

const fetchRequestedCertificateDetails = async () => {
  return await getAllRequestedCertificateDetails();
};

const fetchIssuedCertificateDetails = async () => {
  return await getIssuedCertificateDetails();
};

const fetchEligibleStudents = async () => {
  const response = await getEligibleStudents();
  return response.result || [];
};

const fetchAdminCertificateRequests = async () => {
  const response = await getAllAdminCertificateRequests();
  return response.result || {};
};

const fetchFranchiseeCertificates = async () => {
  const response = await getFranchiseeCertificates();
  return response.result || [];
};

// SWR keys
export const STUDENTS_KEY = "/students/all";
export const REQUESTED_IDS_KEY = "/students/id-details";
export const ISSUED_IDS_KEY = "/students/issued-ids";
export const REQUESTED_CERTIFICATES_KEY = "/students/certificate-details";
export const ISSUED_CERTIFICATES_KEY = "/students/issued-certificates";
export const ELIGIBLE_STUDENTS_KEY = "/certificate/eligible-students";
export const ADMIN_CERTIFICATE_REQUESTS_KEY = "/certificate/all-admin";
export const FRANCHISEE_CERTIFICATES_KEY = "/certificate/my-certificates";

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

export function useRequestedCertificateDetails() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(REQUESTED_CERTIFICATES_KEY, fetchRequestedCertificateDetails);

  return {
    requestedCertificates: data || {},
    isLoading,
    error,
    revalidate,
  };
}

export function useIssuedCertificateDetails() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(ISSUED_CERTIFICATES_KEY, fetchIssuedCertificateDetails);

  return {
    issuedCertificates: data || {},
    isLoading,
    error,
    revalidate,
  };
}

export function useEligibleStudents() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(ELIGIBLE_STUDENTS_KEY, fetchEligibleStudents, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    eligibleStudents: data || [],
    isLoading,
    error,
    revalidate,
  };
}

export function useAdminCertificateRequests() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(ADMIN_CERTIFICATE_REQUESTS_KEY, fetchAdminCertificateRequests, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    certificateRequestsByFranchise: data || {},
    isLoading,
    error,
    revalidate,
  };
}

export function useFranchiseeCertificates() {
  const {
    data,
    error,
    isLoading,
    mutate: revalidate,
  } = useSWR(FRANCHISEE_CERTIFICATES_KEY, fetchFranchiseeCertificates, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    certificates: data || [],
    isLoading,
    error,
    revalidate,
  };
}

export async function createStudentWithRevalidation(
  studentData: Omit<
    StudentData,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >
) {
  const result = await createStudent(studentData);
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
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function deleteStudentWithRevalidation(studentId: number) {
  await deleteStudent(studentId);
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
}

export async function requestStudentIdsWithRevalidation(studentIds: number[]) {
  const result = await requestStudentIds(studentIds);
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function issueIdCardWithRevalidation(studentId: number) {
  const result = await issueIdCard(studentId);
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_IDS_KEY),
    mutate(ISSUED_IDS_KEY),
  ]);
  return result;
}

export async function issueCertificateWithRevalidation(studentId: number) {
  const result = await issueCertificate(studentId);
  await Promise.all([
    mutate(STUDENTS_KEY),
    mutate(REQUESTED_CERTIFICATES_KEY),
    mutate(ISSUED_CERTIFICATES_KEY),
    mutate(ELIGIBLE_STUDENTS_KEY),
  ]);
  return result;
}

export async function approveCertificateRequestWithRevalidation(
  certificateRequestId: number
) {
  const result = await approveCertificateRequest(certificateRequestId);
  await Promise.all([
    mutate(ADMIN_CERTIFICATE_REQUESTS_KEY),
    mutate(FRANCHISEE_CERTIFICATES_KEY),
  ]);
  return result;
}

export async function rejectCertificateRequestWithRevalidation(
  certificateRequestId: number
) {
  const result = await rejectCertificateRequest(certificateRequestId);
  await Promise.all([
    mutate(ADMIN_CERTIFICATE_REQUESTS_KEY),
    mutate(FRANCHISEE_CERTIFICATES_KEY),
  ]);
  return result;
}

export async function revalidateCertificateRequests() {
  await Promise.all([
    mutate(ADMIN_CERTIFICATE_REQUESTS_KEY),
    mutate(FRANCHISEE_CERTIFICATES_KEY),
  ]);
}
