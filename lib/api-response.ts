/** ipa-new wraps successes as `{ success: true, data }`. */
export function unwrapEnvelope<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success: boolean }).success === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}
