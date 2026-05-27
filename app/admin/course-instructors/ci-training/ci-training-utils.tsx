import statesCities from "@/data/indian-states-cities.json";

type StatesCitiesType = Record<string, string[]>;
const statesData = statesCities as StatesCitiesType;

export const stateNames = Object.keys(statesData).sort();

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
  const colors: Record<string, string> = {
    WAITING: "bg-yellow-100 text-yellow-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}
