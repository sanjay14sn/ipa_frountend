import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

interface CITrainingLevel {
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


async function listCITrainingLevels(params?: { programId?: number }): Promise<CITrainingLevel[]> {
  if (!params?.programId) return [];
  const res = await api.get(`/catalog/ci-training-level/by-program/${params.programId}`);
  return unwrapData<CITrainingLevel[]>(res) ?? [];
}

export async function getStudentLevelMappings(ciTrainingLevelId: number): Promise<StudentLevelMapping[]> {
  const res = await api.get(`/catalog/ci-training-level/${ciTrainingLevelId}/student-levels`);
  const payload = unwrapData<StudentLevelMapping[]>(res);
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
