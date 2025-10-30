import axios from "axios";

export interface Program {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface ProgramsResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Program[] | Program;
}

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export async function getAllPrograms(): Promise<Program[]> {
  const response = await api.get<ProgramsResponse>("/program");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createProgram(name: string): Promise<Program> {
  const response = await api.post<ProgramsResponse>("/program", { name });
  return response.data.result as Program;
}

export async function updateProgram(id: number, name: string): Promise<void> {
  await api.patch(`/program/update/${id}`, { name });
}

export async function deleteProgram(id: number): Promise<void> {
  await api.delete(`/program/delete/${id}`);
}
