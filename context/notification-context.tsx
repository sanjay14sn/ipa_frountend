"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Notification, UserType } from "../lib/notification.types";
import { useNotificationSse } from "../hooks/use-notification-sse";
import {
  getNotifications,
  getUnreadCount,
  mapApiNotificationRow,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service";
import { toast } from "sonner";
import { useUser } from "./user-context";
import { queryKeys } from "@/hooks/api/query-keys";
import { sendClientLog } from "@/lib/client-telemetry";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: number) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(
  null,
);

function isNotificationUserType(
  role: string | undefined,
): role is UserType {
  return role === "admin" || role === "franchisee";
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/admin-login";

  const userId = user?.id ? parseInt(user.id, 10) : null;
  const userType = isNotificationUserType(user?.role) ? user.role : null;

  const effectiveUserId = isLoginPage ? null : userId;
  const effectiveUserType = isLoginPage ? null : userType;

  const notificationsEnabled = Boolean(
    effectiveUserId && effectiveUserType,
  );

  const notificationsListKey = useMemo(() => {
    if (!effectiveUserType) return null;
    return effectiveUserType === "admin"
      ? queryKeys.notifications.admin({ unreadOnly: false })
      : queryKeys.notifications.franchisee({ unreadOnly: false });
  }, [effectiveUserType]);

  const unreadKey = useMemo(() => {
    if (!effectiveUserType) return null;
    return effectiveUserType === "admin"
      ? queryKeys.notifications.unreadAdmin
      : queryKeys.notifications.unreadFranchisee;
  }, [effectiveUserType]);

  const notificationsQuery = useQuery({
    // Fallback to a real key so React Query doesn't get a null key;
    // the `enabled` guard prevents fetching when notificationsListKey is null.
    queryKey: notificationsListKey ?? queryKeys.notifications.admin(),
    queryFn: () => getNotifications(effectiveUserType!, false),
    enabled: notificationsEnabled && notificationsListKey != null,
    staleTime: 60 * 1000,
  });

  const unreadQuery = useQuery({
    // Same pattern — real key as placeholder, guarded by `enabled`.
    queryKey: unreadKey ?? queryKeys.notifications.unreadAdmin,
    queryFn: () => getUnreadCount(effectiveUserType!),
    enabled: notificationsEnabled && unreadKey != null,
    staleTime: 60 * 1000,
  });

  const handleNewNotification = useCallback(
    (payload: unknown) => {
      if (!effectiveUserType || !notificationsListKey || !unreadKey) return;

      const row =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : {};
      const notification = mapApiNotificationRow(row);

      queryClient.setQueryData<Notification[]>(
        notificationsListKey,
        (old) => [notification, ...(old ?? [])],
      );
      queryClient.setQueryData<number>(unreadKey, (c) => (c ?? 0) + 1);

      toast.info(notification.title || "New notification", {
        description: notification.message,
        duration: 5000,
      });
    },
    [
      effectiveUserType,
      notificationsListKey,
      unreadKey,
      queryClient,
    ],
  );

  const { isConnected } = useNotificationSse({
    userId: effectiveUserId,
    userType: effectiveUserType,
    onNotification: handleNewNotification,
  });

  const fetchNotifications = useCallback(async () => {
    await notificationsQuery.refetch();
  }, [notificationsQuery]);

  const refreshUnreadCount = useCallback(async () => {
    await unreadQuery.refetch();
  }, [unreadQuery]);

  const markNotificationAsRead = useCallback(
    async (notificationId: number) => {
      if (!effectiveUserType || !notificationsListKey || !unreadKey) return;

      try {
        await markAsRead(effectiveUserType, notificationId);
        queryClient.setQueryData<Notification[]>(
          notificationsListKey,
          (prev) =>
            (prev ?? []).map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n,
            ),
        );
        queryClient.setQueryData<number>(unreadKey, (c) =>
          Math.max(0, (c ?? 0) - 1),
        );
      } catch (error) {
        sendClientLog({ level: "error", event: "notification-mark-read-error", message: "Error marking notification as read", context: { error } });
        toast.error("Failed to mark notification as read");
      }
    },
    [
      effectiveUserType,
      notificationsListKey,
      unreadKey,
      queryClient,
    ],
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!effectiveUserType || !notificationsListKey || !unreadKey) return;

    try {
      await markAllAsRead(effectiveUserType);
      queryClient.setQueryData<Notification[]>(
        notificationsListKey,
        (prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })),
      );
      queryClient.setQueryData<number>(unreadKey, 0);
      toast.success("All notifications marked as read");
    } catch (error) {
      sendClientLog({ level: "error", event: "notification-mark-all-read-error", message: "Error marking all notifications as read", context: { error } });
      toast.error("Failed to mark all notifications as read");
    }
  }, [effectiveUserType, notificationsListKey, unreadKey, queryClient]);

  const notificationContextValue = useMemo(
    () => ({
      notifications: notificationsEnabled
        ? Array.isArray(notificationsQuery.data)
          ? notificationsQuery.data
          : []
        : [],
      unreadCount: notificationsEnabled ? (unreadQuery.data ?? 0) : 0,
      isLoading: notificationsEnabled ? notificationsQuery.isLoading : false,
      isConnected,
      fetchNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      refreshUnreadCount,
    }),
    [
      notificationsEnabled,
      notificationsQuery.data,
      notificationsQuery.isLoading,
      unreadQuery.data,
      isConnected,
      fetchNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      refreshUnreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={notificationContextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
