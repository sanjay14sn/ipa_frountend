import axios from "axios";

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
  franchiseId: number;
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
  level: StudentLevel;
  stream: StudentStream;
  isActive: boolean;
  idIssued: StudentIdStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  updatedBy: number;
}

export interface StudentsResponse extends Response {
  result: StudentData[];
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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
  franchiseName: string;
  franchiseeAddress?: string;
  idIssueDate?: string; // Only present in issued IDs
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

export async function issueIdCard(studentId: number): Promise<any> {
  const response = await api.patch(`/students/issue-id/${studentId}`);
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
