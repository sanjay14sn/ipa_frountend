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

/**
 * Returned by `getEligiblePreviousLevels` — one candidate per row, combining
 * same-stream predecessors with cross-stream `StreamTransition` sources.
 * Mirrors backend `EligiblePreviousLevel` from `level.service.ts`.
 */
export interface EligiblePreviousLevel {
  id: number;
  code: string;
  name: string;
  streamId: number;
  streamName: string;
  displayOrder: number;
  totalMarks: number;
  /** True when the candidate comes from an incoming StreamTransition. */
  viaTransition: boolean;
}

export async function getEligiblePreviousLevels(
  levelId: number,
): Promise<EligiblePreviousLevel[]> {
  const response = await api.get(
    `/catalog/level/${levelId}/eligible-previous-levels`,
  );
  const data = unwrapData<EligiblePreviousLevel[]>(response);
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
