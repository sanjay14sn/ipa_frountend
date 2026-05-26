import { api } from "@/lib/axios";

/**
 * Per-row preview shape returned by every entity's `/preview` endpoint.
 * Mirrors the backend `BulkPreviewResponse<TData>` from
 * `ipa-new/src/modules/bulk-import/application/dto/bulk-preview-response.dto.ts`.
 *
 * `data` is the single commit-ready payload: lookup fields hold resolved
 * IDs (null when the CSV value couldn't be matched); free-text fields hold
 * strings. The admin fixes errors by picking from dropdowns that update
 * `data` in place — the commit endpoint accepts the same shape.
 */
export interface PreviewRow<TData> {
  rowIndex: number;
  data: TData;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface BulkPreviewResponse<TData> {
  rows: Array<PreviewRow<TData>>;
  summary: { total: number; valid: number; invalid: number };
}

export interface BulkCommitResponse<TCreated> {
  created: Array<{ rowIndex: number; record: TCreated }>;
  failed: Array<{ rowIndex: number; error: string }>;
}

/**
 * Upload a CSV file to the given preview endpoint.
 * Backend resolves names → IDs and returns commit-ready rows with per-field
 * errors where resolution failed.
 */
export async function previewBulkUpload<TData>(
  previewUrl: string,
  file: File,
): Promise<BulkPreviewResponse<TData>> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{ result: BulkPreviewResponse<TData> }>(
    previewUrl,
    formData,
  );
  return res.data.result;
}

/**
 * Submit (possibly admin-edited) rows for commit. The backend re-validates
 * and isolates per-row failures.
 */
export async function commitBulkUpload<TData, TCreated>(
  commitUrl: string,
  rows: Array<{ rowIndex: number; data: TData }>,
): Promise<BulkCommitResponse<TCreated>> {
  const res = await api.post<{ result: BulkCommitResponse<TCreated> }>(
    commitUrl,
    { rows },
  );
  return res.data.result;
}

/**
 * Trigger a browser file download from the template endpoint.
 * Uses an anchor click so the browser handles the Content-Disposition header.
 */
export async function downloadBulkImportTemplate(
  templateUrl: string,
  filename: string,
): Promise<void> {
  const res = await api.get<Blob>(templateUrl, { responseType: "blob" });
  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
