import { api } from "@/lib/axios";
import {
  compactRequestParams,
  normalizePaginatedResult,
  unwrapData,
} from "@/lib/unwrap-api";

export interface Program {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldCoordinate {
  xPercent?: number;
  yPercent?: number;
  x?: number;
  y?: number;
  /** PDF bounding box [x1, y1, x2, y2] from legacy template editor */
  rect?: number[];
  label?: string;
  /** Font size in PDF points (backend default: 13). */
  size?: number;
  /** Font key understood by the backend renderer (default: helvetica-bold). */
  font?: string;
  /** When true, the field is skipped during PDF generation. */
  hidden?: boolean;
}

export interface CertificateTemplate {
  id?: number;
  programId?: number;
  fieldCoordinates?: Record<string, FieldCoordinate> | null;
  templateImagePath?: string;
  [key: string]: unknown;
}

export async function getAllPrograms(): Promise<Program[]> {
  const response = await api.get("/catalog/program");
  const data = unwrapData<Program[]>(response);
  return Array.isArray(data) ? data : [];
}

function programNamePayload(nameOrData: string | { name: string }): {
  name: string;
} {
  const name =
    typeof nameOrData === "string" ? nameOrData : nameOrData.name;
  return { name };
}

export async function createProgram(
  nameOrData: string | { name: string },
): Promise<Program> {
  const response = await api.post("/catalog/program", programNamePayload(nameOrData));
  return unwrapData<Program>(response);
}

export async function updateProgram(
  id: number,
  nameOrData: string | { name: string },
): Promise<Program> {
  const response = await api.patch(
    `/catalog/program/update/${id}`,
    programNamePayload(nameOrData),
  );
  return unwrapData<Program>(response);
}

export async function deleteProgram(id: number): Promise<void> {
  await api.delete(`/catalog/program/delete/${id}`);
}

export async function getCertificateTemplate(
  programId?: number,
  listParams?: { page?: number; limit?: number; search?: string; streamId?: number },
): Promise<CertificateTemplate> {
  const response = await api.get("/admin/certification/template", {
    params: compactRequestParams({
      programId,
      page: listParams?.page ?? 1,
      limit: listParams?.limit ?? (programId != null ? 100 : 500),
      search: listParams?.search,
      streamId: listParams?.streamId,
    } as Record<string, string | number | boolean | undefined | null>),
  });
  const result = unwrapData<unknown>(response);
  const { rows } = normalizePaginatedResult<CertificateTemplate>(result);
  if (programId != null) {
    const row = rows.find((t) => Number(t.programId) === programId);
    return row ?? rows[0] ?? { fieldCoordinates: {} };
  }
  return rows[0] ?? { fieldCoordinates: {} };
}

export async function updateCertificateTemplate(
  programId: number,
  data: Record<string, unknown> & { id?: number },
  streamId?: number | null,
): Promise<void> {
  const { id, ...payload } = data;
  if (id != null) {
    await api.patch(`/admin/certification/template/${id}`, payload);
  } else {
    await api.post("/admin/certification/template", {
      ...payload,
      programId,
      ...(streamId != null ? { streamId } : {}),
      templatePdfPath: payload.templatePdfPath ?? "",
    });
  }
}

export async function uploadCertificateTemplate(
  programId: number,
  file: File,
  data?: {
    certificateTitle?: string;
    issuerName?: string;
    fieldCoordinates?: Record<string, unknown>;
    additionalText?: string;
    isActive?: boolean;
  },
  streamId?: number | null,
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("programId", String(programId));
  if (streamId != null) form.append("streamId", String(streamId));
  if (data) form.append("data", JSON.stringify(data));
  await api.post("/admin/certification/template/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
