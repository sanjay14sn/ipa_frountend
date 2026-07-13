import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";
import type { AgreementContent } from "@/lib/agreementContent";

export type AgreementTemplateKind = "INITIAL" | "RENEWAL";

export interface ProgramAgreementTemplate {
  id: number;
  programId: number | null;
  kind: AgreementTemplateKind;
  version: number;
  content: AgreementContent;
  isCurrent: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch the program's current agreement template for `kind` (or the global
 * default when the program has none). Returns null when the backend has no
 * template at all.
 */
export async function getProgramAgreementTemplate(
  programId: number,
  kind: AgreementTemplateKind,
): Promise<ProgramAgreementTemplate | null> {
  const response = await api.get(
    `/catalog/program/${programId}/agreement-template/${kind}`,
  );
  const data = unwrapData<ProgramAgreementTemplate | null>(response);
  return data ?? null;
}

/** List every version of the program's template for `kind` (DESC by version). */
export async function listProgramAgreementTemplateVersions(
  programId: number,
  kind: AgreementTemplateKind,
): Promise<ProgramAgreementTemplate[]> {
  const response = await api.get(
    `/catalog/program/${programId}/agreement-template/${kind}/versions`,
  );
  const data = unwrapData<ProgramAgreementTemplate[]>(response);
  return Array.isArray(data) ? data : [];
}

/**
 * Save a NEW version of the program's template for `kind` (SuperAdmin only).
 * Returns the newly-created template.
 */
export async function saveProgramAgreementTemplate(
  programId: number,
  kind: AgreementTemplateKind,
  content: AgreementContent,
): Promise<ProgramAgreementTemplate> {
  const response = await api.put(
    `/catalog/program/${programId}/agreement-template/${kind}`,
    { content },
  );
  return unwrapData<ProgramAgreementTemplate>(response);
}
