import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface TrainingLevel {
  id: number;
  programId: number;
  name: string;
  code: string;
  description?: string | null;
  durationInDays: number;
  fee: number;
  theoryTotalMarks: number;
  theoryPassMark: number;
  practicalTotalMarks?: number | null;
  practicalPassMark?: number | null;
  practicalMarksRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTrainingLevelDto {
  programId: number;
  name: string;
  code: string;
  description?: string;
  durationInDays: number;
  fee?: number;
  theoryTotalMarks?: number;
  theoryPassMark?: number;
  practicalTotalMarks?: number | null;
  practicalPassMark?: number | null;
  practicalMarksRequired?: boolean;
  displayOrder: number;
  isActive?: boolean;
}

export type UpdateTrainingLevelDto = Partial<
  Omit<CreateTrainingLevelDto, "programId">
>;

function mapRow(row: Record<string, unknown>): TrainingLevel {
  return {
    id: Number(row.id ?? 0),
    programId: Number(row.programId ?? 0),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    description: row.description == null ? null : String(row.description ?? ""),
    durationInDays: Number(row.durationInDays ?? 1),
    fee: Number(row.fee ?? 0),
    theoryTotalMarks: Number(row.theoryTotalMarks ?? 100),
    theoryPassMark: Number(row.theoryPassMark ?? 40),
    practicalTotalMarks:
      row.practicalTotalMarks == null ? null : Number(row.practicalTotalMarks),
    practicalPassMark:
      row.practicalPassMark == null ? null : Number(row.practicalPassMark),
    practicalMarksRequired: Boolean(row.practicalMarksRequired ?? false),
    displayOrder: Number(row.displayOrder ?? 1),
    isActive: Boolean(row.isActive ?? true),
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
  };
}

export async function getTrainingLevelsByProgram(
  programId: number,
): Promise<TrainingLevel[]> {
  const response = await api.get(
    `/catalog/ci-training-level/by-program/${programId}`,
  );
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data)
    ? data.map((row) => mapRow(row as Record<string, unknown>))
    : [];
}

export async function getTrainingLevelsForProgram(
  programId: number,
): Promise<TrainingLevel[]> {
  return getTrainingLevelsByProgram(programId);
}

export async function getActiveTrainingLevels(): Promise<TrainingLevel[]> {
  const programsResponse = await api.get("/catalog/program");
  const programs = unwrapData<Array<{ id: number }>>(programsResponse);
  const lists = await Promise.all(
    (Array.isArray(programs) ? programs : []).map((program) =>
      getTrainingLevelsByProgram(Number(program.id)),
    ),
  );
  return lists
    .flat()
    .filter((level) => level.isActive)
    .sort((a, b) =>
      a.displayOrder === b.displayOrder
        ? a.id - b.id
        : a.displayOrder - b.displayOrder,
    );
}

export async function createTrainingLevel(
  data: CreateTrainingLevelDto,
): Promise<TrainingLevel> {
  const response = await api.post("/catalog/ci-training-level", data);
  return mapRow(unwrapData<Record<string, unknown>>(response));
}

export async function updateTrainingLevel(
  id: number,
  data: UpdateTrainingLevelDto,
): Promise<TrainingLevel> {
  const response = await api.patch(`/catalog/ci-training-level/${id}`, data);
  return mapRow(unwrapData<Record<string, unknown>>(response));
}

export async function deleteTrainingLevel(id: number): Promise<void> {
  await api.delete(`/catalog/ci-training-level/${id}`);
}
