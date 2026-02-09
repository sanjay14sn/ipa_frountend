

export interface ProgramKit {
  id: number;
  programId: number;
  inventoryId: number;
  defaultQuantity: number;
  createdAt?: string;
  updatedAt?: string;
  inventory?: {
    id: number;
    name: string;
    description: string;
    categoryId: number;
    category?: {
      id: number;
      name: string;
      description: string;
      isActive: boolean;
    };
  };
}

export interface FranchiseProgramKit {
  id: number;
  franchiseId: string;
  programId: number;
  inventoryId: number;
  quantity: number;
  createdAt?: string;
  updatedAt?: string;
  inventory?: {
    id: number;
    name: string;
    description: string;
    categoryId: number;
    category?: {
      id: number;
      name: string;
      description: string;
      isActive: boolean;
    };
  };
  program?: {
    id: number;
    name: string;
  };
}

export interface CreateProgramKitDto {
  inventoryId: number;
  defaultQuantity: number;
}

export interface UpdateProgramKitDto {
  defaultQuantity?: number;
}

export interface FranchiseProgramKitItem {
  inventoryId: number;
  quantity: number;
}

export interface FranchiseProgramKitGroup {
  programId: number;
  kitItems: FranchiseProgramKitItem[];
}

export interface AssignFranchiseKitsDto {
  franchiseId: string;
  programKits: FranchiseProgramKitGroup[];
}

export interface StartingKitResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result:
    | ProgramKit[]
    | ProgramKit
    | FranchiseProgramKit[]
    | FranchiseProgramKit;
}

import { api } from "@/lib/axios";

export async function getProgramKits(programId: number): Promise<ProgramKit[]> {
  const response = await api.get<StartingKitResponse>(
    `/starting-kit/program/${programId}`
  );
  return Array.isArray(response.data.result) ? (response.data.result as ProgramKit[]) : [];
}

export async function createProgramKit(
  programId: number,
  kit: CreateProgramKitDto
): Promise<ProgramKit> {
  const response = await api.post<StartingKitResponse>(
    `/starting-kit/program/${programId}`,
    kit
  );
  return response.data.result as ProgramKit;
}

export async function updateProgramKit(
  id: number,
  kit: UpdateProgramKitDto
): Promise<void> {
  await api.patch(`/starting-kit/program/${id}`, kit);
}

export async function deleteProgramKit(id: number): Promise<void> {
  await api.delete(`/starting-kit/program/${id}`);
}

export async function getFranchiseProgramKits(
  franchiseId: string,
  programId: number
): Promise<FranchiseProgramKit[]> {
  const response = await api.get<StartingKitResponse>(
    `/starting-kit/franchise/${franchiseId}/program/${programId}`
  );
  return Array.isArray(response.data.result) ? (response.data.result as FranchiseProgramKit[]) : [];
}

export async function getAllFranchiseProgramKits(
  franchiseId: string
): Promise<FranchiseProgramKit[]> {
  const response = await api.get<StartingKitResponse>(
    `/starting-kit/franchise/${franchiseId}`
  );
  return Array.isArray(response.data.result) ? (response.data.result as FranchiseProgramKit[]) : [];
}

export async function assignFranchiseKits(
  kits: AssignFranchiseKitsDto
): Promise<void> {
  await api.post(`/starting-kit/franchise`, kits);
}
