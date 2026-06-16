import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

export interface Program {
  id: number;
  name: string;
  code?: string | null;
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
  /** Name of this pooled template (required by the backend). */
  name?: string;
  certificateTitle?: string;
  issuerName?: string;
  templatePdfPath?: string;
  additionalText?: string | null;
  isActive?: boolean;
  fieldCoordinates?: Record<string, FieldCoordinate> | null;
  templateImagePath?: string;
  [key: string]: unknown;
}

export async function getAllPrograms(): Promise<Program[]> {
  const response = await api.get("/catalog/program");
  const data = unwrapData<Program[]>(response);
  return Array.isArray(data) ? data : [];
}

function programPayload(
  nameOrData: string | { name: string; code?: string | null },
): { name: string; code?: string } {
  if (typeof nameOrData === "string") return { name: nameOrData };
  const payload: { name: string; code?: string } = { name: nameOrData.name };
  const code = nameOrData.code?.trim();
  if (code) payload.code = code;
  return payload;
}

export async function createProgram(
  nameOrData: string | { name: string; code?: string | null },
): Promise<Program> {
  const response = await api.post("/catalog/program", programPayload(nameOrData));
  return unwrapData<Program>(response);
}

export async function updateProgram(
  id: number,
  nameOrData: string | { name: string; code?: string | null },
): Promise<Program> {
  const response = await api.patch(
    `/catalog/program/update/${id}`,
    programPayload(nameOrData),
  );
  return unwrapData<Program>(response);
}

export async function deleteProgram(id: number): Promise<void> {
  await api.delete(`/catalog/program/delete/${id}`);
}

/**
 * The program's full pool of named certificate templates. Returns a plain
 * array (NOT paginated).
 */
export async function listCertificateTemplates(
  programId: number,
): Promise<CertificateTemplate[]> {
  const response = await api.get("/admin/certification/template", {
    params: { programId },
  });
  const data = unwrapData<CertificateTemplate[]>(response);
  return Array.isArray(data) ? data : [];
}

export type CertificateTemplatePayload = {
  name?: string;
  certificateTitle?: string;
  issuerName?: string;
  fieldCoordinates?: Record<string, unknown>;
  additionalText?: string;
  isActive?: boolean;
  templatePdfPath?: string;
};

export async function updateCertificateTemplate(
  programId: number,
  data: CertificateTemplatePayload & { id?: number },
): Promise<void> {
  const { id, ...payload } = data;
  if (id != null) {
    await api.patch(`/admin/certification/template/${id}`, payload);
  } else {
    await api.post("/admin/certification/template", {
      ...payload,
      programId,
      templatePdfPath: payload.templatePdfPath ?? "",
    });
  }
}

export async function uploadCertificateTemplate(
  programId: number,
  file: File,
  data: {
    name: string;
    certificateTitle?: string;
    issuerName?: string;
    fieldCoordinates?: Record<string, unknown>;
    additionalText?: string;
    isActive?: boolean;
  },
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  form.append("programId", String(programId));
  form.append("data", JSON.stringify(data));
  await api.post("/admin/certification/template/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function deleteCertificateTemplate(id: number): Promise<void> {
  await api.delete(`/admin/certification/template/${id}`);
}
