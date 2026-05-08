import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface Level {
  id: number;
  name: string;
  code: string;
  programId: number;
  streamId: number;
  displayOrder: number;
  totalMarks: number;
  isActive?: boolean;
  passMark?: number;
  durationInMonths?: number;
}

export interface CreateLevelDto {
  name: string;
  code: string;
  programId: number;
  streamId: number;
  displayOrder: number;
  totalMarks: number;
  isActive?: boolean;
  passMark?: number;
  durationInMonths?: number;
}

export type UpdateLevelDto = Partial<
  Omit<CreateLevelDto, "programId">
> & { programId?: number };

export async function getAllLevels(): Promise<Level[]> {
  const response = await api.get("/catalog/level");
  const data = unwrapData<Level[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getLevelsByProgram(programId: number): Promise<Level[]> {
  const response = await api.get(`/catalog/level/by-program/${programId}`);
  const data = unwrapData<Level[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getLevelsByStream(streamId: number): Promise<Level[]> {
  const response = await api.get(`/catalog/level/stream/${streamId}`);
  const data = unwrapData<Level[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function createLevel(data: CreateLevelDto): Promise<Level> {
  const response = await api.post("/catalog/level", data);
  return unwrapData<Level>(response);
}

export async function updateLevel(
  id: number,
  data: UpdateLevelDto,
): Promise<Level> {
  const response = await api.patch(`/catalog/level/${id}`, data);
  return unwrapData<Level>(response);
}

export async function deleteLevel(id: number): Promise<void> {
  await api.delete(`/catalog/level/${id}`);
}
