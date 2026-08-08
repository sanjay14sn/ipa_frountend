import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface StreamTransition {
  id: number;
  programId: number;
  fromStreamId: number;
  toStreamId: number;
  toLevelDisplayOrder: number;
}

export interface CreateStreamTransitionDto {
  programId: number;
  fromStreamId: number;
  toStreamId: number;
  toLevelDisplayOrder: number;
}

export type UpdateStreamTransitionDto = Partial<CreateStreamTransitionDto>;

export async function getTransitionsByProgram(
  programId: number,
): Promise<StreamTransition[]> {
  const response = await api.get(
    `/catalog/stream-transition/program/${programId}`,
  );
  const data = unwrapData<StreamTransition[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function createStreamTransition(
  data: CreateStreamTransitionDto,
): Promise<StreamTransition> {
  const response = await api.post("/catalog/stream-transition", data);
  return unwrapData<StreamTransition>(response);
}

export async function updateStreamTransition(
  id: number,
  data: UpdateStreamTransitionDto,
): Promise<StreamTransition> {
  const response = await api.patch(`/catalog/stream-transition/${id}`, data);
  return unwrapData<StreamTransition>(response);
}

export async function deleteStreamTransition(id: number): Promise<void> {
  await api.delete(`/catalog/stream-transition/${id}`);
}
