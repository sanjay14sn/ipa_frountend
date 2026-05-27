/**
 * lib/url-utils.ts — Shared URL utility functions.
 *
 * Migration guide:
 *   - `s.startsWith("http://") || s.startsWith("https://")` → `isAbsoluteUrl(s)`
 */

/**
 * Returns `true` when `url` is an absolute HTTP/HTTPS URL.
 *
 * Handles `null`/`undefined` gracefully (returns `false`).
 *
 * @example
 * isAbsoluteUrl("https://example.com/foo")  // true
 * isAbsoluteUrl("/api/v1/profile")            // false
 * isAbsoluteUrl(null)                         // false
 */
export function isAbsoluteUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Returns the origin of an absolute URL, or an empty string for relative URLs.
 *
 * Useful for building CSP `connect-src` directives from an env-var base URL.
 *
 * @example
 * getOrigin("https://api.example.com/v1")  // "https://api.example.com"
 * getOrigin("http://localhost:5500")        // "http://localhost:5500"
 * getOrigin("/api/proxy")                   // ""
 */
export function getOrigin(url: string | null | undefined): string {
  if (!url || !isAbsoluteUrl(url)) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
