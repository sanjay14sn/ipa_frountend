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
  franchise: {
    id: number;
    name: string;
  };
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
  franchise: {
    id: number;
    name: string;
  };
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
  trainingLevelId?: number;
  additionalDetails?: string;
}

export interface CreateCourseInstructorResponse extends Response {
  result: CourseInstructorData;
}

import { api } from "@/lib/axios";

export async function getAllCourseInstructors(): Promise<CourseInstructorsResponse> {
  const response =
    await api.get<CourseInstructorsResponse>("/course-instructor");
  return response.data;
}

export async function getCourseInstructorById(
  courseInstructorId: number,
): Promise<CourseInstructorData> {
  const response = await api.get<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}`,
  );
  return response.data;
}

export async function createCourseInstructor(
  courseInstructorData: CreateCourseInstructorRequest,
): Promise<CourseInstructorData> {
  const response = await api.post<CourseInstructorData>(
    "/course-instructor",
    courseInstructorData,
  );
  return response.data;
}

export async function updateCourseInstructor(
  courseInstructorId: number,
  courseInstructorData: Partial<CourseInstructorData>,
): Promise<CourseInstructorData> {
  const response = await api.put<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}`,
    courseInstructorData,
  );
  return response.data;
}

export async function deleteCourseInstructor(
  courseInstructorId: number,
): Promise<void> {
  await api.delete(`/course-instructors/${courseInstructorId}`);
}

export async function activateCourseInstructor(
  courseInstructorId: number,
): Promise<CourseInstructorData> {
  const response = await api.patch<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}/activate`,
  );
  return response.data;
}

export async function deactivateCourseInstructor(
  courseInstructorId: number,
): Promise<CourseInstructorData> {
  const response = await api.patch<CourseInstructorData>(
    `/course-instructors/${courseInstructorId}/deactivate`,
  );
  return response.data;
}

// Admin-specific interfaces and functions
export interface TrainingLevelInfo {
  id: number;
  name: string;
  amount: number;
  displayOrder: number;
  rank?: number;
}

export interface AdminCourseInstructorData extends CourseInstructorData {
  instructorId: string;
  status: "Pending" | "Approved" | "Rejected";
  franchise: {
    id: number;
    name: string;
  };
  trainingLevels?: TrainingLevelInfo[];
  ciTrainingLevels?: TrainingLevelInfo[];
  totalTrainingAmount?: number;
}

export function getInstructorTrainingLevels(
  instructor: Pick<
    AdminCourseInstructorData,
    "trainingLevels" | "ciTrainingLevels"
  >,
): TrainingLevelInfo[] {
  if (instructor.ciTrainingLevels && instructor.ciTrainingLevels.length > 0) {
    return instructor.ciTrainingLevels;
  }
  return instructor.trainingLevels || [];
}

export function getInstructorTrainingLevelCount(
  instructor: Pick<
    AdminCourseInstructorData,
    "trainingLevels" | "ciTrainingLevels"
  >,
): number {
  return getInstructorTrainingLevels(instructor).length;
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
  courseInstructorId: number,
): Promise<AdminCourseInstructorData> {
  const response = await api.patch<AdminCourseInstructorData>(
    `/course-instructor/status/Approve/${courseInstructorId}`,
  );
  return response.data;
}

export async function rejectCourseInstructor(
  courseInstructorId: number,
): Promise<AdminCourseInstructorData> {
  const response = await api.patch<AdminCourseInstructorData>(
    `/course-instructor/status/Reject/${courseInstructorId}`,
  );
  return response.data;
}

export interface ApproveTrainingRequest {
  dateOfTraining: Date;
  amount: number;
}

export interface ApproveTrainingResponse extends Response {
  result: {
    instructorId: string;
    dateOfTraining: string;
    amount: number;
    approvedAt: string;
    approvedBy: string;
  };
}

export async function approveTraining(
  instructorId: string,
  trainingData: ApproveTrainingRequest,
): Promise<ApproveTrainingResponse> {
  const response = await api.post<ApproveTrainingResponse>(
    `/course-instructor/approve-training/${instructorId}`,
    trainingData,
  );
  return response.data;
}

// CI Training interfaces and functions
export interface CITrainingData {
  id: number;
  instructorId: string;
  instructorName: string;
  trainingLevelId: number;
  trainingLevelName: string;
  amount: number;
  additionalDetails?: string;
  displayOrder?: number;
  isActive: boolean;
  isCompleted: boolean;
  dateOfTraining?: string;
  createdAt?: string;
  franchise: {
    id: number;
    name: string;
  };
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

export interface CompleteTrainingRequest {
  marksObtained?: number;
  certificateNumber?: string;
  notes?: string;
}

export interface CompleteTrainingWithGraduationResponse {
  message: string;
  graduationRecorded: boolean;
}

export async function completeTraining(
  id: number,
  data?: CompleteTrainingRequest,
): Promise<CompleteTrainingWithGraduationResponse> {
  const response = await api.patch<{
    result: CompleteTrainingWithGraduationResponse;
  }>(`/ci-training/complete/${id}`, data || {});
  return response.data.result;
}

// Training Course Instructor interfaces and functions
export interface TrainingCourseInstructorData {
  id: number;
  instructorId: string;
  name: string;
  status: string;
  trainingLevelName?: string;
  additionalDetails?: string;
  amount: number;
  paidAmount?: number;
}

export interface TrainingCourseInstructorsResponse extends Response {
  result: TrainingCourseInstructorData[];
}

export async function getTrainingCourseInstructors(): Promise<TrainingCourseInstructorsResponse> {
  const response = await api.get<TrainingCourseInstructorsResponse>(
    "/course-instructor/training",
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
  params: CourseInstructorPaginationParams,
): Promise<PaginatedCourseInstructorsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.limit !== undefined)
    queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{
    result: PaginatedCourseInstructorsResponse;
  }>(`/course-instructor/paginated/${status}?${queryParams.toString()}`);
  return response.data.result;
}

export async function getPaginatedFranchiseeCourseInstructors(
  params: CourseInstructorPaginationParams,
): Promise<PaginatedCourseInstructorsResponse> {
  const queryParams = new URLSearchParams();

  if (params.page !== undefined)
    queryParams.append("page", params.page.toString());
  if (params.limit !== undefined)
    queryParams.append("limit", params.limit.toString());
  if (params.search) queryParams.append("search", params.search);
  if (params.status) queryParams.append("status", params.status);
  if (params.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

  const response = await api.get<{
    result: PaginatedCourseInstructorsResponse;
  }>(`/course-instructor/paginated-franchisee?${queryParams.toString()}`);
  return response.data.result;
}

// CI Level Graduation interfaces and functions
export interface CILevelGraduation {
  id: number;
  instructorId: number;
  trainingLevelId: number;
  graduationDate: string;
  certificateNumber?: string;
  marksObtained?: number;
  notes?: string;
  trainingLevel: {
    id: number;
    name: string;
    description: string;
    amount: number;
  };
}

export interface CIGraduationsResponse {
  result: CILevelGraduation[];
}

export async function getCIGraduations(
  instructorId: number,
): Promise<CILevelGraduation[]> {
  const response = await api.get<CIGraduationsResponse>(
    `/ci-training/graduations/${instructorId}`,
  );
  return response.data.result;
}

export interface CIGraduationsByFranchise {
  [franchiseName: string]: Array<{
    id: number;
    instructorName: string;
    instructorCode: string;
    levelName: string;
    graduationDate: string;
    certificateNumber?: string;
    marksObtained?: number;
    notes?: string;
  }>;
}

export interface AllCIGraduationsResponse {
  result: CIGraduationsByFranchise;
}

export async function getAllCIGraduations(): Promise<CIGraduationsByFranchise> {
  const response = await api.get<AllCIGraduationsResponse>(
    "/ci-training/graduations-all",
  );
  return response.data.result;
}

// CI Training Progress interfaces and functions
export interface CITrainingProgressItem {
  id: number;
  trainingLevelId: number;
  trainingLevelName: string;
  amount: number;
  isCompleted: boolean;
  isActive: boolean;
  paid: boolean;
  displayOrder: number;
  marks?: number;
}

export interface CITrainingProgress {
  totalTrainings: number;
  completedTrainings: number;
  progress: number;
  trainings: CITrainingProgressItem[];
  activeTraining: {
    id: number;
    trainingLevelName: string;
    displayOrder: number;
  } | null;
}

export interface CITrainingProgressResponse {
  result: CITrainingProgress;
}

export async function getCITrainingProgress(
  instructorId: number,
): Promise<CITrainingProgress> {
  const response = await api.get<CITrainingProgressResponse>(
    `/ci-training/progress/${instructorId}`,
  );
  return response.data.result;
}

export interface AvailableNextTrainingLevelCounts {
  totalNextLevels: number;
  halfOfAvailableCount: number;
  allAvailableCount: number;
  nextLevelNames: string[];
}

export interface AvailableTrainingLevelsResponse {
  result: { result: { data: AvailableNextTrainingLevelCounts } };
}

export async function getAvailableTrainingLevelsForCI(
  instructorId: number,
): Promise<AvailableNextTrainingLevelCounts> {
  const response = await api.get<AvailableTrainingLevelsResponse>(
    `/course-instructor/available-training-levels/${instructorId}`,
  );
  return response.data.result.result.data;
}

export interface RequestAdditionalTrainingRequest {
  scope: "half" | "all";
  additionalDetails?: string;
}

export interface RequestAdditionalTrainingResponse extends Response {
  result: any[];
}

export async function requestAdditionalTraining(
  instructorId: number,
  data: RequestAdditionalTrainingRequest,
): Promise<RequestAdditionalTrainingResponse> {
  const response = await api.post<RequestAdditionalTrainingResponse>(
    `/course-instructor/request-training/${instructorId}`,
    data,
  );
  return response.data;
}
