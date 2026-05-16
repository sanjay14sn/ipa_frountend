/**
 * Strips the trailing standard UUID (8-4-4-4-12) for compact UI labels.
 * API requests should still use the full `full` value unless product says otherwise.
 */
const TRAILING_UUID =
  /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatEntityCodeForDisplay(full: string | null | undefined): string {
  if (full == null || full === "") return "";
  const trimmed = full.trim();
  if (!trimmed) return "";
  const withoutUuid = trimmed.replace(TRAILING_UUID, "");
  return withoutUuid.replace(/-+$/, "") || trimmed;
}
