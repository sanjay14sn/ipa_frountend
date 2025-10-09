import axios from "axios";
import { Notification, NotificationResponse, UserType } from "../lib/notification.types";

const baseUrl = "http://localhost:5000";

const api = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Helper function to get the correct base path for notifications based on user type
function getNotificationBasePath(userType: UserType): string {
  return userType === 'admin' ? '/admin/notifications' : '/user/notifications';
}

export async function getNotifications(
  userType: UserType,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.get<NotificationResponse>(basePath, {
    params: { unreadOnly },
  });
  return response.data.result as Notification[];
}

export async function getUnreadCount(
  userType: UserType
): Promise<number> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.get<NotificationResponse>(`${basePath}/unread-count`);
  return (response.data.result as { count: number }).count;
}

export async function markAsRead(userType: UserType, notificationId: number): Promise<Notification> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.patch<NotificationResponse>(
    `${basePath}/${notificationId}/read`
  );
  return response.data.result as Notification;
}

export async function markAllAsRead(
  userType: UserType
): Promise<number> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.patch<NotificationResponse>(
    `${basePath}/mark-all-read`
  );
  return (response.data.result as { count: number }).count;
}

export async function deleteNotification(userType: UserType, notificationId: number): Promise<void> {
  const basePath = getNotificationBasePath(userType);
  await api.delete(`${basePath}/${notificationId}`);
}

export async function deleteAllNotifications(
  userType: UserType
): Promise<number> {
  const basePath = getNotificationBasePath(userType);
  const response = await api.delete<NotificationResponse>(basePath);
  return (response.data.result as { count: number }).count;
}
