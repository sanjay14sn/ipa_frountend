import { API_BASE_URL } from "@/lib/config";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Resolve a renderable URL from a stored uploads-relative path (e.g.
 * "profile-photos/students/3-ab12….jpg" → "<api>/uploads/profile-photos/…").
 * Returns null when nothing is stored. The backend serves /uploads behind the
 * session cookie, so the result is for <img>/axios use on an authenticated
 * page — never next/image (its optimizer can't forward credentials).
 */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Fast-fail mirror of the server's photo rules (type + 5MB) so a doomed
 * upload never leaves the browser. The server remains the authority — it
 * re-validates by magic bytes.
 */
export function validatePhotoFile(file: File): string | null {
  if (!PHOTO_MIME_TYPES.has(file.type)) {
    return "Photo must be a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be 5MB or smaller.";
  }
  return null;
}

export function uploadedFileSrc(
  storedPath: string | null | undefined,
): string | null {
  if (storedPath == null || String(storedPath).trim() === "") return null;
  const s = String(storedPath).trim();
  if (isAbsoluteUrl(s)) return s;
  if (s.startsWith("data:")) return null;
  const rel = s.replace(/^\/+/, "");
  if (!rel) return null;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/uploads/${rel}`;
}
