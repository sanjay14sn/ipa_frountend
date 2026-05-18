import {
  Notification,
  NotificationResponse,
  UserType,
} from "../lib/notification.types";

import { api } from "@/lib/axios";
export { mapApiNotificationRow } from "@/lib/notification-content";
import { mapApiNotificationRow } from "@/lib/notification-content";

// ipa-new: `GET /notification` (franchisee) and `GET /admin/notification` (admin)
function getNotificationBasePath(userType: UserType): string {
  return userType === "admin" ? "/admin/notification" : "/notification";
}

/** Backend may return a plain array (legacy) or paginated `{ rows, total, page, limit }`. */
function normalizeNotificationListResult(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === "object" &&
    "rows" in raw &&
    Array.isArray((raw as { rows: unknown }).rows)
  ) {
    return (raw as { rows: unknown[] }).rows;
  }
  return [];
}

export async function getNotifications(
  userType: UserType,
  unreadOnly: boolean = false,
): Promise<Notification[]> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.get<NotificationResponse>(basePath, {
    params: {
      unreadOnly,
      page: 1,
      limit: 100,
    },
  });
  const raw = response.data.result;
  const rows = normalizeNotificationListResult(raw);
  return rows.map((r) =>
    mapApiNotificationRow(
      r && typeof r === "object" ? (r as Record<string, unknown>) : {},
    ),
  );
}

export async function getUnreadCount(
  userType: UserType,
): Promise<number> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.get<NotificationResponse>(`${basePath}/unread-count`);
  const r = response.data.result as number | { count: number } | undefined;
  if (r == null) return 0;
  if (typeof r === "number") return r;
  return r.count ?? 0;
}

export async function markAsRead(
  userType: UserType,
  notificationId: number,
): Promise<Notification> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.patch<NotificationResponse>(
    `${basePath}/${notificationId}/read`,
  );
  return response.data.result as Notification;
}

export async function markAllAsRead(
  userType: UserType,
): Promise<number> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.patch<NotificationResponse>(
    `${basePath}/read-all`,
  );
  return (response.data.result as { count: number }).count;
}

export async function deleteNotification(
  userType: UserType,
  notificationId: number,
): Promise<void> {
  const basePath = getNotificationBasePath(userType);
  await api.delete(`${basePath}/${notificationId}`);
}

