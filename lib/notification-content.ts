import type { Notification } from "./notification.types";

type NotificationUserType = "admin" | "franchisee";

function parseNotificationDate(
  value: unknown,
  fallback = (): Date => new Date(),
): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (value == null || value === "") {
    return fallback();
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? fallback() : d;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseNotificationAction(
  metadata: Record<string, unknown>,
): Notification["action"] {
  const action = metadata.action;
  if (!action || typeof action !== "object") return undefined;
  const record = action as Record<string, unknown>;
  return {
    label: record.label != null ? String(record.label) : undefined,
    href: record.href != null ? String(record.href) : undefined,
  };
}

/** Map ipa-new persistence row / socket payload to UI Notification. */
export function mapApiNotificationRow(row: Record<string, unknown>): Notification {
  const title = row.title != null ? String(row.title) : "";
  const body = row.body != null ? String(row.body) : "";
  const message =
    (row.message != null ? String(row.message) : "") ||
    body ||
    title;
  const metadata = parseMetadata(row.metadata);

  const recipientType =
    row.recipientType != null
      ? String(row.recipientType)
      : "";
  const userType: NotificationUserType =
    recipientType === "admin" ? "admin" : "franchisee";

  const createdRaw = row.createdAt ?? row.created_at;
  const updatedRaw = row.updatedAt ?? row.updated_at;
  const now = () => new Date();
  const createdAt = parseNotificationDate(createdRaw, now);
  const updatedAt =
    updatedRaw != null && updatedRaw !== ""
      ? parseNotificationDate(updatedRaw, () => createdAt)
      : createdAt;

  return {
    id: Number(row.id),
    recipientId: Number(row.recipientId),
    type: row.type as Notification["type"],
    title: title || undefined,
    message,
    action: parseNotificationAction(metadata),
    isRead: Boolean(row.isRead),
    userType,
    createdAt,
    updatedAt,
  };
}
