/**
 * Strip a trailing UUID and/or `#id` suffix from a stored agreement title
 * (CC-14 — this regex was duplicated four times across agreement surfaces).
 */
export function cleanAgreementTitle(
  title: string | null | undefined,
  fallback = "Franchise Agreement",
): string {
  const cleaned = (title ?? "")
    .replace(
      /\s+\S*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\S*$/i,
      "",
    )
    .replace(/\s+#?\d+\s*$/, "")
    .trim();
  return cleaned || fallback;
}
