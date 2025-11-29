

export interface Program {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface ProgramsResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: Program[] | Program;
}

import { api } from "@/lib/axios";

export async function getAllPrograms(): Promise<Program[]> {
  const response = await api.get<ProgramsResponse>("/program");
  return Array.isArray(response.data.result) ? response.data.result : [];
}

export async function createProgram(name: string): Promise<Program> {
  const response = await api.post<ProgramsResponse>("/program", { name });
  return response.data.result as Program;
}

export async function updateProgram(id: number, name: string): Promise<void> {
  await api.patch(`/program/update/${id}`, { name });
}

export async function deleteProgram(id: number): Promise<void> {
  await api.delete(`/program/delete/${id}`);
}

export interface FieldCoordinate {
  rect: [number, number, number, number];
  label: string;
}

export interface CertificateTemplate {
  id: number;
  programId: number;
  templatePdfPath?: string;
  certificateTitle: string;
  issuerName: string;
  signatureField1Label?: string;
  signatureField1Name?: string;
  signatureField2Label?: string;
  signatureField2Name?: string;
  additionalText?: string;
  fieldCoordinates?: Record<string, FieldCoordinate> | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificateTemplateResponse {
  statusCode: number;
  timeStamp: string;
  method: string;
  path: string;
  message: string;
  result: CertificateTemplate | null;
}

export async function getCertificateTemplate(
  programId: number
): Promise<CertificateTemplate | null> {
  const response = await api.get<CertificateTemplateResponse>(
    `/certificate/template/${programId}`
  );
  return response.data.result;
}

export async function updateCertificateTemplate(
  programId: number,
  templateData: Omit<CertificateTemplate, "id" | "programId" | "createdAt" | "updatedAt">
): Promise<CertificateTemplate> {
  const response = await api.post<CertificateTemplateResponse>(
    `/certificate/template/${programId}`,
    templateData
  );
  return response.data.result as CertificateTemplate;
}

export async function uploadCertificateTemplate(
  programId: number,
  file: File
): Promise<CertificateTemplate> {
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await api.post<CertificateTemplateResponse>(
    `/certificate/template/${programId}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data.result as CertificateTemplate;
}
