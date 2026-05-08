import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  withCredentials: true,
});

export interface CITrainingPackage {
  id: number;
  programId: number;
  name: string;
  code: string;
  description?: string | null;
  packageOrder: number;
  fee: number;
  isActive: boolean;
  trainingLevelIds: number[];
  createdAt?: string;
}

export interface CITrainingLevel {
  id: number;
  programId: number;
  name: string;
  level: number;
  theoryTotal: number;
  practicalTotal: number;
  region?: string;
}

export interface StudentLevelMapping {
  levelId: number;
  levelName?: string;
  levelNumber?: number;
}

export async function listCITrainingPackages(params: {
  programId: number;
}): Promise<CITrainingPackage[]> {
  const res = await api.get(
    `/catalog/ci-training-package/by-program/${params.programId}`,
  );
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function createCITrainingPackage(input: {
  programId: number;
  name: string;
  code: string;
  description?: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
}): Promise<CITrainingPackage> {
  const res = await api.post("/catalog/ci-training-package", input);
  return res.data?.data ?? res.data;
}

export async function updateCITrainingPackage(id: number, input: Partial<{
  name: string;
  code: string;
  description: string;
  packageOrder: number;
  fee: number;
  trainingLevelIds: number[];
  isActive: boolean;
}>): Promise<CITrainingPackage> {
  const res = await api.patch(`/catalog/ci-training-package/${id}`, input);
  return res.data?.data ?? res.data;
}

export async function generateDefaultPackages(programId: number): Promise<CITrainingPackage[]> {
  const res = await api.post(
    "/catalog/ci-training-package/generate-default",
    null,
    { params: { programId } },
  );
  const payload = res.data?.data ?? res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function listCITrainingLevels(params?: { programId?: number }): Promise<CITrainingLevel[]> {
  if (!params?.programId) return [];
  const res = await api.get(`/catalog/ci-training-level/by-program/${params.programId}`);
  return res.data?.data ?? res.data ?? [];
}

export async function getStudentLevelMappings(ciTrainingLevelId: number): Promise<StudentLevelMapping[]> {
  const res = await api.get(`/catalog/ci-training-level/${ciTrainingLevelId}/student-levels`);
  const payload = res.data?.data ?? res.data;
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item: any): StudentLevelMapping | null => {
      const levelId = Number(
        item?.levelId ??
          item?.level?.id ??
          item?.id ??
          item?.studentLevelId,
      );
      if (!Number.isFinite(levelId) || levelId <= 0) return null;

      return {
        levelId,
        levelName:
          item?.levelName ??
          item?.level?.name ??
          item?.name ??
          item?.code,
        levelNumber:
          item?.levelNumber ??
          item?.level?.level ??
          item?.level?.displayOrder,
      } satisfies StudentLevelMapping;
    })
    .filter((item): item is StudentLevelMapping => item !== null);
}

export async function setStudentLevelMappings(
  ciTrainingLevelId: number,
  levelIds: number[],
  programId: number,
): Promise<void> {
  await api.patch(`/catalog/ci-training-level/${ciTrainingLevelId}/student-levels`, {
    levelIds,
    programId,
  });
}
