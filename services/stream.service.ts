import { api } from "@/lib/axios";

export interface Stream {
  id: number;
  programId: number;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
  program?: {
    id: number;
    name: string;
  };
}

export interface CreateStreamDto {
  programId: number;
  name: string;
  isActive: boolean;
}

export interface UpdateStreamDto {
  programId?: number;
  name?: string;
  isActive?: boolean;
}

export interface StreamsResponse {
  statusCode: number;
  timeStamp: string;
  path: string;
  result: Stream[];
}

export interface StreamResponse {
  statusCode: number;
  timeStamp: string;
  path: string;
  result: Stream;
}

export async function getAllStreams(): Promise<Stream[]> {
  const response = await api.get<StreamsResponse>("/stream");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function getStreamsByProgram(programId: number): Promise<Stream[]> {
  const response = await api.get<StreamsResponse>(`/stream/program/${programId}`);
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createStream(stream: CreateStreamDto): Promise<Stream> {
  const response = await api.post<StreamResponse>("/stream", stream);
  return response.data.result;
}

export async function updateStream(id: number, stream: UpdateStreamDto): Promise<void> {
  await api.patch(`/stream/update/${id}`, stream);
}

export async function deleteStream(id: number): Promise<void> {
  await api.delete(`/stream/delete/${id}`);
}

