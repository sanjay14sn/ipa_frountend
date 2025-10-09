import axios from "axios";

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export enum BloodGroup {
  A_POSITIVE = "A+",
  A_NEGATIVE = "A-",
  B_POSITIVE = "B+",
  B_NEGATIVE = "B-",
  AB_POSITIVE = "AB+",
  AB_NEGATIVE = "AB-",
  O_POSITIVE = "O+",
  O_NEGATIVE = "O-",
}

export enum CITrainingType {
  ELEMENTARY = "Elementary",
  REGULAR = "Regular",
  GRAND = "Grand",
}

export interface CourseInstructorData {
  id: number;
  franchiseId: number;
  programId: number;
  instructorId: string;
  name: string;
  dob: Date;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  expiryDate: Date;
  trainingProof?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

export interface CourseInstructorsResponse extends Response {
  result: CourseInstructorData[];
}

export interface CreateCourseInstructorRequest {
  franchiseId: number;
  programId: number;
  instructorId: string;
  name: string;
  dob: Date;
  bloodGroup: BloodGroup;
  address: string;
  city: string;
  phone: string;
  mail: string;
  education: string;
  occupation: string;
  reference: string;
  expiryDate: Date;
  trainingProof?: string;
  trainingType?: CITrainingType;
  dateOfTraining?: Date;
  additionalDetails?: string;
}

export interface CreateCourseInstructorResponse extends Response {
  result: CourseInstructorData;
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function getAllCourseInstructors(): Promise<CourseInstructorsResponse> {
  const response = await api.get<CourseInstructorsResponse>(
    "/course-instructor"
  );
  return response.data;
}

export async function getCourseInstructorById(
  courseInstructorId: number
): Promise<CourseInstructorData> {
  const response = await api.get<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}`
  );
  return response.data;
}

export async function createCourseInstructor(
  courseInstructorData: CreateCourseInstructorRequest
): Promise<CourseInstructorData> {
  const response = await api.post<CourseInstructorData>(
    "/course-instructor",
    courseInstructorData
  );
  return response.data;
}

export async function updateCourseInstructor(
  courseInstructorId: number,
  courseInstructorData: Partial<CourseInstructorData>
): Promise<CourseInstructorData> {
  const response = await api.put<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}`,
    courseInstructorData
  );
  return response.data;
}

export async function deleteCourseInstructor(
  courseInstructorId: number
): Promise<void> {
  await api.delete(`/course-instructors/${courseInstructorId}`);
}

export async function activateCourseInstructor(
  courseInstructorId: number
): Promise<CourseInstructorData> {
  const response = await api.patch<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}/activate`
  );
  return response.data;
}

export async function deactivateCourseInstructor(
  courseInstructorId: number
): Promise<CourseInstructorData> {
  const response = await api.patch<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}/deactivate`
  );
  return response.data;
}

// Admin-specific interfaces and functions
export interface AdminCourseInstructorData extends CourseInstructorData {
  instructorId: string;
  status: "Pending" | "Approved" | "Rejected";
  franchiseName: string;
}

export interface AdminCourseInstructorsByFranchise {
  [franchiseName: string]: AdminCourseInstructorData[];
}

export interface AdminCourseInstructorsByStatus {
  Pending?: AdminCourseInstructorsByFranchise;
  Approved?: AdminCourseInstructorsByFranchise;
  Rejected?: AdminCourseInstructorsByFranchise;
}

export interface AdminCourseInstructorsResponse extends Response {
  result: AdminCourseInstructorsByStatus;
}

export async function getAllAdminCourseInstructors(): Promise<AdminCourseInstructorsByStatus> {
  const response = await api.get("/course-instructor/all-admin-applications");
  const data = response.data as AdminCourseInstructorsResponse;
  if (
    data?.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result)
  ) {
    return data.result as AdminCourseInstructorsByStatus;
  }
  return {};
}

export async function approveCourseInstructor(
  courseInstructorId: number
): Promise<AdminCourseInstructorData> {
  const response = await api.patch<AdminCourseInstructorData>(
    `/course-instructor/status/Approve/${courseInstructorId}`
  );
  return response.data;
}

export async function rejectCourseInstructor(
  courseInstructorId: number
): Promise<AdminCourseInstructorData> {
  const response = await api.patch<AdminCourseInstructorData>(
    `/course-instructor/status/Reject/${courseInstructorId}`
  );
  return response.data;
}

export interface ApproveTrainingRequest {
  dateOfTraining: Date;
  amount: number;
  installmentCount?: number;
  installmentAmount?: number;
}

export interface ApproveTrainingResponse extends Response {
  result: {
    instructorId: string;
    dateOfTraining: string;
    amount: number;
    installmentCount?: number;
    installmentAmount?: number;
    approvedAt: string;
    approvedBy: string;
  };
}

export async function approveTraining(
  instructorId: string,
  trainingData: ApproveTrainingRequest
): Promise<ApproveTrainingResponse> {
  const response = await api.post<ApproveTrainingResponse>(
    `/course-instructor/approve-training/${instructorId}`,
    trainingData
  );
  return response.data;
}

// CI Training interfaces and functions
export interface CITrainingData {
  id: number;
  instructorId: string;
  trainingType: string;
  additionalDetails?: string;
  amount: number;
  installmentCount?: number;
  installmentAmount?: number;
  instructorName: string;
  franchiseName: string;
  isApproved?: boolean;
}

export interface CITrainingByFranchise {
  [franchiseName: string]: CITrainingData[];
}

export interface CITrainingResponse extends Response {
  result: CITrainingByFranchise;
}

export async function getAllCITraining(): Promise<CITrainingByFranchise> {
  const response = await api.get<CITrainingResponse>("/ci-training/all");
  return response.data.result;
}

export interface CompleteTrainingResponse extends Response {
  result: string;
}

export async function completeTraining(
  id: number
): Promise<CompleteTrainingResponse> {
  const response = await api.patch<CompleteTrainingResponse>(
    `/ci-training/complete/${id}`
  );
  return response.data;
}

// Training Course Instructor interfaces and functions
export interface TrainingCourseInstructorData {
  id: number;
  instructorId: string;
  name: string;
  status: string;
  trainingType: string;
  additionalDetails?: string;
  amount: number;
  installmentCount: number;
  installmentAmount: number;
  paidAmount?: number;
  paidInstallmentCount?: number;
}

export interface TrainingCourseInstructorsResponse extends Response {
  result: TrainingCourseInstructorData[];
}

export async function getTrainingCourseInstructors(): Promise<TrainingCourseInstructorsResponse> {
  const response = await api.get<TrainingCourseInstructorsResponse>(
    "/course-instructor/training"
  );
  return response.data;
}

// Pagination interfaces and functions
export interface CourseInstructorPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedCourseInstructorsResponse {
  data: AdminCourseInstructorData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function getPaginatedCourseInstructors(
  status: string,
  params: CourseInstructorPaginationParams
): Promise<PaginatedCourseInstructorsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined) queryParams.append("page", params.page.toString());
  if (params.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{ result: PaginatedCourseInstructorsResponse }>(
    `/course-instructor/paginated/${status}?${queryParams.toString()}`
  );
  return response.data.result;
}
