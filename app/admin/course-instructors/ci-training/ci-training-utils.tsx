import {
  StatusBadge as SharedStatusBadge,
  formatStatusLabel,
} from "@/components/shared";
import statesCities from "@/data/indian-states-cities.json";

export const stateNames = Object.keys(statesCities).sort();

export function formatStateLabel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const responseMessage = (
    err as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(", ");
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }
  return fallback;
}

export function StatusBadge({ status }: { status: string }) {
  // Thin delegate to the shared pill (SW-P1); "assigned" keeps its info
  // reading (it was the blue pill here).
  return (
    <SharedStatusBadge
      label={formatStatusLabel(status)}
      tone={status === "ASSIGNED" ? "info" : undefined}
    />
  );
}
