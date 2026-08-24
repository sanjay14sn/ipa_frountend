import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface Stream {
  id: number;
  name: string;
  programId?: number | null;
  levelCount?: number;
  minAge?: number | null;
  maxAge?: number | null;
  displayOrder?: number;
  description?: string | null;
  isActive?: boolean;
  hasStartingKit?: boolean;
}

export interface LevelItem {
  id: number;
  name: string;
  code: string;
  streamId: number;
  programId?: number;
  displayOrder?: number;
  durationInMonths?: number;
}

export interface CreateStreamDto {
  name: string;
  programId: number;
  isActive?: boolean;
  hasStartingKit?: boolean;
  description?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  displayOrder?: number;
}

export type UpdateStreamDto = Partial<Omit<CreateStreamDto, never>>;

export async function getAllStreams(): Promise<Stream[]> {
  const response = await api.get("/catalog/stream");
  const data = unwrapData<Stream[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getStreamsByProgram(programId: number): Promise<Stream[]> {
  const response = await api.get(`/catalog/stream/program/${programId}`);
  const data = unwrapData<Stream[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getLevelsByStream(streamId: number): Promise<LevelItem[]> {
  const response = await api.get(`/catalog/level/stream/${streamId}`);
  const data = unwrapData<LevelItem[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getAllLevelsByProgram(programId: number = 1): Promise<LevelItem[]> {
  const response = await api.get(`/catalog/level/by-program/${programId}`);
  const data = unwrapData<LevelItem[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function createStream(data: CreateStreamDto): Promise<Stream> {
  const response = await api.post("/catalog/stream", data);
  return unwrapData<Stream>(response);
}

export async function updateStream(
  id: number,
  data: UpdateStreamDto,
): Promise<Stream> {
  const response = await api.patch(`/catalog/stream/${id}`, data);
  return unwrapData<Stream>(response);
}

export async function deleteStream(id: number): Promise<void> {
  await api.delete(`/catalog/stream/${id}`);
}
