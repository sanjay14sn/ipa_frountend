import { api } from "@/lib/axios";
import { unwrapData } from "@/lib/unwrap-api";

/**
 * Summary of a certificate template attached to a level (mirrors the inventory
 * level-items shape). One row per template attached to the level.
 */
export interface LevelCertificateTemplate {
  id: number;
  programId: number;
  name: string;
  certificateTitle?: string;
  issuerName?: string;
  isActive: boolean;
  displayOrder?: number | null;
}

function normalizeLevelCertificateRow(raw: unknown): LevelCertificateTemplate {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: Number(r.id ?? 0),
    programId: Number(r.programId ?? 0),
    name: String(r.name ?? ""),
    certificateTitle: r.certificateTitle != null ? String(r.certificateTitle) : undefined,
    issuerName: r.issuerName != null ? String(r.issuerName) : undefined,
    isActive: Boolean(r.isActive ?? true),
    displayOrder: r.displayOrder == null ? null : Number(r.displayOrder),
  };
}

export async function getCertificateTemplatesForLevel(
  levelId: number,
): Promise<LevelCertificateTemplate[]> {
  const response = await api.get(`/admin/certification/level/${levelId}/templates`);
  const data = unwrapData<unknown[]>(response);
  return Array.isArray(data) ? data.map(normalizeLevelCertificateRow) : [];
}

export async function bulkAssignCertificateTemplatesToLevel(
  levelId: number,
  items: Array<{ certificateTemplateId: number; displayOrder?: number }>,
): Promise<{ assigned: number; failed: number[] }> {
  const response = await api.post(
    `/admin/certification/level/${levelId}/templates/bulk-assign`,
    { items },
  );
  return unwrapData(response) as { assigned: number; failed: number[] };
}

export async function unassignCertificateTemplateFromLevel(
  levelId: number,
  templateId: number,
): Promise<void> {
  await api.delete(`/admin/certification/level/${levelId}/templates/${templateId}`);
}
