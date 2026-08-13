import { api } from "@/lib/axios";
import { compactRequestParams } from "@/lib/unwrap-api";

/**
 * Trigger a browser file download for a Blob via a temporary anchor click,
 * so the browser applies the given filename.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * THE shared CSV-export client: fetch a server-built CSV (blob) and save it.
 * Every table export goes through here (franchises, students, inventory,
 * course instructors) — services own only their endpoint path + params.
 * `filename` without an extension gets today's date + `.csv` appended
 * (`students-export` → `students-export-2026-08-11.csv`); pass a full
 * `.csv` name to keep it verbatim (date-range exports).
 */
export async function downloadCsvExport(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
  filename: string,
): Promise<void> {
  const response = await api.get<Blob>(path, {
    params: compactRequestParams(params),
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
  const finalName = filename.endsWith(".csv")
    ? filename
    : `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  triggerBlobDownload(blob, finalName);
}
