import { api } from "@/lib/axios";

export interface TrainingLevel {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  amount: number;
  rank?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Response {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
}

export interface TrainingLevelResponse extends Response {
  result: {
    data: TrainingLevel;
  };
}

export interface TrainingLevelsResponse {
  statusCode: number;
  message: string;
  result: {
    data: TrainingLevel[];
  };
}

export async function getAllTrainingLevels(): Promise<TrainingLevel[]> {
  const response = await api.get<TrainingLevelsResponse>("/training-level");
  return response.data.result.data;
}

export async function getActiveTrainingLevels(): Promise<TrainingLevel[]> {
  const response = await api.get<TrainingLevelsResponse>(
    "/training-level/active"
  );
  return response.data.result.data;
}

export async function getTrainingLevelById(id: number): Promise<TrainingLevel> {
  const response = await api.get<TrainingLevelResponse>(
    `/training-level/${id}`
  );
  return response.data.result.data;
}

export async function createTrainingLevel(
  data: Partial<TrainingLevel>
): Promise<TrainingLevel> {
  const response = await api.post<TrainingLevelResponse>(
    "/training-level",
    data
  );
  return response.data.result.data;
}

export async function updateTrainingLevel(
  id: number,
  data: Partial<TrainingLevel>
): Promise<TrainingLevel> {
  const response = await api.patch<TrainingLevelResponse>(
    `/training-level/update/${id}`,
    data
  );
  return response.data.result.data;
}

export async function deleteTrainingLevel(id: number): Promise<void> {
  await api.delete(`/training-level/delete/${id}`);
}
