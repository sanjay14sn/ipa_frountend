

import { api } from "@/lib/axios";

// Note: CSV template is generated on the client now

export async function bulkUploadFranchises(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/franchise/bulk-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export interface FranchiseListItem {
  id: number;
  name: string;
}

export async function getFranchiseList(): Promise<FranchiseListItem[]> {
  const response = await api.get("/franchise/list");
  const data = response.data as any;
  if (Array.isArray(data)) return data as FranchiseListItem[];
  if (Array.isArray(data?.result)) return data.result as FranchiseListItem[];
  if (Array.isArray(data?.franchises))
    return data.franchises as FranchiseListItem[];
  return [];
}
