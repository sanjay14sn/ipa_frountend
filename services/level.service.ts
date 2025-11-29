

export interface Level {
  id: number;
  programId: number;
  name: string;
  code: string;
  totalMarks: number;
  passMark: number;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface CreateLevelDto {
  programId: number;
  name: string;
  code: string;
  totalMarks: number;
  passMark: number;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdateLevelDto {
  name?: string;
  code?: string;
  totalMarks?: number;
  passMark?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface LevelsResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Level[] | Level;
}

import { api } from "@/lib/axios";

export async function getAllLevels(): Promise<Level[]> {
  const response = await api.get<LevelsResponse>("/level");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getLevelsByProgram(programId: number): Promise<Level[]> {
  const response = await api.get<LevelsResponse>(`/level/program/${programId}`);
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createLevel(level: CreateLevelDto): Promise<Level> {
  const response = await api.post<LevelsResponse>("/level", level);
  return response.data.result as Level;
}

export async function updateLevel(id: number, level: UpdateLevelDto): Promise<void> {
  await api.patch(`/level/update/${id}`, level);
}

export async function deleteLevel(id: number): Promise<void> {
  await api.delete(`/level/delete/${id}`);
}
