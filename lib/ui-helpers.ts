import { format, parseISO } from "date-fns";
import { formatRupees } from "@/lib/currency-utils";

export function getInitials(
  name: string | null | undefined,
  max = 2,
): string {
  if (!name) return "";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0]!.slice(0, max).toUpperCase();
  }
  return parts
    .slice(0, max)
    .map((p) => p[0]!)
    .join("")
    .toUpperCase();
}

function getSinceLabel(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), "MMM yyyy");
  } catch {
    return null;
  }
}

function getTimeRemaining(
  expiresIso: string | null | undefined,
): string {
  if (!expiresIso) return "-";
  try {
    const ms = parseISO(expiresIso).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 12) return `${months}m`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `~${y}y ${m}m` : `~${y}y`;
  } catch {
    return "-";
  }
}

function fmtShort(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "PP");
  } catch {
    return String(iso);
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "p");
  } catch {
    return "";
  }
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return format(parseISO(iso), "PPpp");
  } catch {
    return String(iso);
  }
}

function money(value: number | string | null | undefined): string {
  return formatRupees(Number(value ?? 0));
}

function stripIdSuffix(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/\s+[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i, "")
    .trim();
}
