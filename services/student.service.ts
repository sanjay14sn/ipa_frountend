export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum StudentLevel {
  EL1 = "EL1",
  EL2 = "EL2",
  EL3 = "EL3",
  EL4 = "EL4",
  EL5 = "EL5",
  EL6 = "EL6",
  RL1 = "RL1",
  RL2 = "RL2",
  RL3 = "RL3",
  RL4 = "RL4",
  RL5 = "RL5",
  RL6 = "RL6",
  RL7 = "RL7",
  RL8 = "RL8",
  RL9 = "RL9",
  RL10 = "RL10",
  GML1 = "GML1",
  GML2 = "GML2",
  GML3 = "GML3",
}

export enum StudentStream {
  REGULAR = "Regular",
  SUMMER_CAMP = "Summer Camp",
}

export enum StudentIdStatus {
  NOT_ISSUED = "Not Issued",
  ISSUED = "Issued",
  REQUESTED = "Requested",
}

export interface StudentData {
  id: number;
  franchiseId: string;
  programId: number;
  name: string;
  rollNo: string;
  dateOfBirth: Date;
  sex: string;
  fatherName: string;
  fatherQualification: string;
  fatherOccupation: string;
  motherName: string;
  motherQualification: string;
  motherOccupation: string;
  residentialAddress: string;
  fatherContactNo: string;
  motherContactNo: string;
  mail: string;
  standard: string;
  levelId?: number;
  level:
    | StudentLevel
    | string
    | { id: number; name: string; code: string; streamId: number };
  stream: StudentStream;
  isActive: boolean;
  idIssued: StudentIdStatus;
  deactivateDate?: Date;
  dateOfJoining?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  updatedBy: number;
}

export interface StudentsResponse extends Response {
  result: StudentData[];
}

import { api } from "@/lib/axios";

export async function getAllStudents(): Promise<StudentsResponse> {
  const response = await api.get<StudentsResponse>("/students/all");
  return response.data;
}

export async function getStudentById(studentId: number): Promise<StudentData> {
  const response = await api.get<StudentData>(`/students/${studentId}`);
  return response.data;
}

export async function createStudent(
  studentData: Omit<
    StudentData,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
  >
): Promise<StudentData> {
  const response = await api.post<StudentData>("/students/create", studentData);
  return response.data;
}

export async function updateStudent(
  studentId: number,
  studentData: Partial<StudentData>
): Promise<StudentData> {
  const response = await api.put<StudentData>(
    `/students/${studentId}`,
    studentData
  );
  return response.data;
}

export async function deleteStudent(studentId: number): Promise<void> {
  await api.delete(`/students/${studentId}`);
}

export async function activateStudent(studentId: number): Promise<StudentData> {
  const response = await api.patch<StudentData>(
    `/students/${studentId}/activate`
  );
  return response.data;
}

export async function deactivateStudent(
  studentId: number
): Promise<StudentData> {
  const response = await api.patch<StudentData>(
    `/students/${studentId}/deactivate`
  );
  return response.data;
}

export async function issueStudentId(studentId: number): Promise<StudentData> {
  const response = await api.patch<StudentData>(
    `/students/${studentId}/issue-id`
  );
  return response.data;
}

export async function requestStudentIds(
  studentIds: number[]
): Promise<Response> {
  const response = await api.post<Response>("/students/request-id", {
    ids: studentIds,
  });
  return response.data;
}

export interface RequestedIdDetail {
  id?: number; // Student ID for issuing
  name: string;
  rollNo: string;
  dateOfBirth?: string;
  residentialAddress?: string;
  fatherContactNo?: string;
  motherContactNo?: string;
  franchiseName?: string;
  franchiseeAddress?: string;
  idIssueDate?: string; // Only present in issued IDs
  franchise?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface RequestedIdDetailsByFranchise {
  [franchiseName: string]: RequestedIdDetail[];
}

export async function getAllRequestedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  const response = await api.get("/students/id-details");
  const data = response.data as any;
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result as RequestedIdDetailsByFranchise;
  }
  return {};
}

export async function issueIdCard(rollNo: string): Promise<any> {
  const response = await api.patch(`/students/issue-id/${rollNo}`);
  return response.data;
}

export async function getIssuedIdDetails(): Promise<RequestedIdDetailsByFranchise> {
  const response = await api.get("/students/issued-ids");
  const data = response.data as any;
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result as RequestedIdDetailsByFranchise;
  }
  return {};
}

// Certificate-related interfaces and functions
export interface RequestedCertificateDetail {
  id?: number; // Student ID for issuing
  name: string;
  rollNo: string;
  dateOfBirth?: string;
  residentialAddress?: string;
  fatherContactNo?: string;
  motherContactNo?: string;
  franchiseName: string;
  franchiseeAddress?: string;
  marksObtained: number;
  totalMarks: number;
  courseInstructorId: number;
  courseInstructorName?: string;
  certificateIssueDate?: string; // Only present in issued certificates
}

export interface RequestedCertificateDetailsByFranchise {
  [franchiseName: string]: RequestedCertificateDetail[];
}

export async function getAllRequestedCertificateDetails(): Promise<RequestedCertificateDetailsByFranchise> {
  const response = await api.get("/students/certificate-details");
  const data = response.data as any;
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result as RequestedCertificateDetailsByFranchise;
  }
  return {};
}

export async function getIssuedCertificateDetails(): Promise<RequestedCertificateDetailsByFranchise> {
  const response = await api.get("/students/issued-certificates");
  const data = response.data as any;
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result as RequestedCertificateDetailsByFranchise;
  }
  return {};
}

export async function issueCertificate(studentId: number): Promise<any> {
  const response = await api.patch(`/students/issue-certificate/${studentId}`);
  return response.data;
}

export interface EligibleStudent {
  id: number;
  name: string;
  rollNo: string;
  dateOfBirth: string;
  sex: string;
  standard: string;
  stream: string;
  levelName: string;
  isActive: boolean;
}

export interface EligibleStudentsResponse extends Response {
  result: EligibleStudent[];
}

export async function getEligibleStudents(): Promise<EligibleStudentsResponse> {
  const response = await api.get<EligibleStudentsResponse>(
    "/certificate/eligible-students"
  );
  return response.data;
}

export interface AdminCertificateRequest {
  id: number;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  studentName: string;
  studentRollNo: string;
  studentDateOfBirth: string;
  studentSex: string;
  studentStandard: string;
  studentStream: string;
  studentLevel: string;
  studentIsActive: boolean;
  studentDateOfJoining?: string;
  studentIdIssued: string;
  studentIdIssueDate?: string;
  instructorName: string;
  franchiseName: string;
  certificatePdfPath?: string;
  issueDate?: string;
}

export interface AdminCertificateRequestsByFranchise {
  [franchiseName: string]: AdminCertificateRequest[];
}

export interface AdminCertificateRequestsResponse extends Response {
  result: AdminCertificateRequestsByFranchise;
}

export async function getAllAdminCertificateRequests(): Promise<AdminCertificateRequestsResponse> {
  const response = await api.get<AdminCertificateRequestsResponse>(
    "/certificate/all-admin"
  );
  return response.data;
}

export async function approveCertificateRequest(
  certificateRequestId: number
): Promise<any> {
  const response = await api.patch(
    `/certificate/approve/${certificateRequestId}`
  );
  return response.data;
}

export async function rejectCertificateRequest(
  certificateRequestId: number
): Promise<any> {
  const response = await api.patch(
    `/certificate/reject/${certificateRequestId}`
  );
  return response.data;
}

// Pagination interfaces
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedStudentsResponse {
  data: StudentData[];
  meta: PaginationMeta;
}

export interface GroupedIdDetailsData {
  [franchiseName: string]: RequestedIdDetail[];
}

export interface PaginatedIdDetailsResponse {
  data: GroupedIdDetailsData;
  meta: PaginationMeta;
}

export interface StudentPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

// Pagination functions
export async function getPaginatedStudents(
  params: StudentPaginationParams
): Promise<PaginatedStudentsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedStudentsResponse }>(
    `/students/paginated?${queryParams.toString()}`
  );
  return response.data.result;
}

export async function getPaginatedRequestedIdDetails(
  params: StudentPaginationParams
): Promise<PaginatedIdDetailsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedIdDetailsResponse }>(
    `/students/id-details/paginated?${queryParams.toString()}`
  );
  return response.data.result;
}

export async function getPaginatedIssuedIds(
  params: StudentPaginationParams
): Promise<PaginatedIdDetailsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedIdDetailsResponse }>(
    `/students/issued-ids/paginated?${queryParams.toString()}`
  );
  return response.data.result;
}

export interface CertificatePaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedCertificatesResponse {
  data: AdminCertificateRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getPaginatedCertificates(
  params: CertificatePaginationParams
): Promise<PaginatedCertificatesResponse> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedCertificatesResponse }>(
    `/certificate/paginated?${queryParams.toString()}`
  );
  return response.data.result;
}

export interface FranchiseeCertificate {
  id: number;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  issueDate?: string;
  certificatePdfPath?: string;
  studentName: string;
  studentRollNo: string;
  studentDateOfBirth: string;
  studentSex: string;
  studentStandard: string;
  studentStream: string;
  studentLevel: string;
  instructorName: string;
  instructorInstructorId: string;
}

export interface FranchiseeCertificatesResponse extends Response {
  result: FranchiseeCertificate[];
}

export async function getFranchiseeCertificates(): Promise<FranchiseeCertificatesResponse> {
  const response = await api.get<FranchiseeCertificatesResponse>(
    "/certificate/my-certificates"
  );
  return response.data;
}

export function getCertificatePdfUrl(certificatePdfPath: string): string {
  if (!certificatePdfPath) return "";
  // certificatePdfPath is stored as "certificates/filename.pdf"
  // Backend serves static files at /uploads/ prefix
  const baseUrl = api.defaults.baseURL || "http://localhost:5000";
  return `${baseUrl}/uploads/${certificatePdfPath}`;
}

export interface BulkCertificateRequestItem {
  studentId: number;
  marksObtained: number;
}

export interface BulkCertificateRequestDto {
  courseInstructerId: number;
  students: BulkCertificateRequestItem[];
}

export interface BulkCertificateRequestResponse extends Response {
  result: any[];
}

export async function bulkRequestCertificates(
  data: BulkCertificateRequestDto
): Promise<BulkCertificateRequestResponse> {
  const response = await api.post<BulkCertificateRequestResponse>(
    "/certificate/bulk-request",
    data
  );
  return response.data;
}

export interface StudentCertificate {
  id: number;
  studentId: number;
  instructorId: number;
  franchiseId: string;
  levelId: number;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected";
  marksObtained: number;
  totalMarks: number;
  issueDate?: string;
  certificatePdfPath?: string;
  studentName: string;
  studentRollNo: string;
  studentLevel: string;
  certificateLevel: string;
  levelDisplayOrder: number;
  instructorName: string;
  instructorInstructorId: string;
}

export interface StudentCertificatesResponse extends Response {
  result: StudentCertificate[];
}

export async function getStudentCertificates(
  studentId: number
): Promise<StudentCertificatesResponse> {
  const response = await api.get<StudentCertificatesResponse>(
    `/certificate/student/${studentId}`
  );
  return response.data;
}
