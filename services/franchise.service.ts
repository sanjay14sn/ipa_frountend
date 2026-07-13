import { api } from "@/lib/axios";
import { unwrapData, normalizePaginatedResult } from "@/lib/unwrap-api";
import { requestPrograms } from "./program-request.service";

/** Apply for a new franchise (franchisee JWT). */
export interface ApplyForFranchisePayload {
  name: string;
  type: string;
  city: string;
  state: string;
  address?: string;
  pincode?: string;
  /** Single program id when the API expects one */
  programId?: number;
  /** Multi-select UI — submit with {@link programId} set to the first id if needed */
  programIds?: number[];
}

export type RequestFranchiseDto = ApplyForFranchisePayload;

export interface FranchiseListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  city?: string;
  state?: string;
}

export async function getFranchiseList(): Promise<FranchiseListItem[]> {
  const response = await api.get("/franchise");
  const data = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<Record<string, unknown>>(data);
  return rows.map((r) => ({
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    type: String(r.type ?? ""),
    status: String(r.status ?? ""),
    city: r.city as string | undefined,
    state: r.state as string | undefined,
  }));
}

export async function hasPendingRequest(): Promise<boolean> {
  const list = await getFranchiseList();
  return list.some((f) => f.status === "Pending");
}

export async function requestNewFranchise(body: ApplyForFranchisePayload) {
  const response = await api.post("/franchise/apply", body);
  return unwrapData(response);
}

/** Program-request row shape consumed by the admin requests table. */
export interface ProgramRequestRow {
  id: number;
  franchiseId: string;
  programId: number;
  status: string;
  program?: { id: number; name: string };
  franchise?: { id: string; code?: string | null; name: string; city?: string; state?: string };
  franchisee?: { id: number; name: string; mail?: string; phone?: string };
  requestedBy?: string;
  createdAt?: string;
}

export interface RequestProgramDto {
  franchiseId: string;
  programIds: number[];
  notes?: string;
}

export async function requestProgram(dto: RequestProgramDto): Promise<unknown> {
  await requestPrograms(dto.franchiseId, dto.programIds);
  return {};
}
