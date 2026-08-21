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
import { isFranchiseOperational } from "@/lib/auth";
import { queryKeys } from "@/hooks/api/query-keys";
import { sendClientLog } from "@/lib/client-telemetry";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isConnected: boolean;
  isHardDisconnected: boolean;
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

/**
 * Explicit recipient identity for portals that don't authenticate through
 * `UserProvider` (the CI portal). When supplied, it overrides the derived
 * admin/franchisee identity — mount a nested provider with it so the bell
 * inside that subtree talks to the right notification endpoints.
 */
export interface NotificationIdentity {
  userId: number | null;
  userType: UserType | null;
}

export function NotificationProvider({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity?: NotificationIdentity;
}) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/admin-login";

  const userId = user?.id ? parseInt(user.id, 10) : null;
  const userType = isNotificationUserType(user?.role) ? user.role : null;

  // Every /notification route sits behind the backend's operational-access
  // guard, so a pre-active franchisee (still in the sign-and-pay funnel)
  // would get a guaranteed 403 on the list + unread-count queries — which
  // the global QueryCache toasts, twice, on every login. Keep the bell fully
  // dormant (queries + SSE) until the franchise is operational. Admin and
  // explicit CI identities are unaffected.
  const franchiseeNotOperational =
    !identity && userType === "franchisee" && !isFranchiseOperational(user);

  const effectiveUserId = identity
    ? identity.userId
    : isLoginPage || franchiseeNotOperational
      ? null
      : userId;
  const effectiveUserType = identity
    ? identity.userType
    : isLoginPage || franchiseeNotOperational
      ? null
      : userType;

  const notificationsEnabled = Boolean(
    effectiveUserId && effectiveUserType,
  );

  const notificationsListKey = useMemo(() => {
    if (!effectiveUserType) return null;
    return effectiveUserType === "admin"
      ? queryKeys.notifications.admin({ unreadOnly: false })
      : effectiveUserType === "ci"
        ? queryKeys.notifications.ci({ unreadOnly: false })
        : queryKeys.notifications.franchisee({ unreadOnly: false });
  }, [effectiveUserType]);

  const unreadKey = useMemo(() => {
    if (!effectiveUserType) return null;
    return effectiveUserType === "admin"
      ? queryKeys.notifications.unreadAdmin
      : effectiveUserType === "ci"
        ? queryKeys.notifications.unreadCi
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

  const { isConnected, isHardDisconnected } = useNotificationSse({
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

      // Snapshot before optimistic update so we can roll back on failure
      const prevList = queryClient.getQueryData<Notification[]>(notificationsListKey);
      const prevCount = queryClient.getQueryData<number>(unreadKey);

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

      try {
        await markAsRead(effectiveUserType, notificationId);
      } catch (error) {
        // Roll back optimistic update
        queryClient.setQueryData(notificationsListKey, prevList);
        queryClient.setQueryData(unreadKey, prevCount);
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

    // Snapshot before optimistic update so we can roll back on failure
    const prevList = queryClient.getQueryData<Notification[]>(notificationsListKey);
    const prevCount = queryClient.getQueryData<number>(unreadKey);

    queryClient.setQueryData<Notification[]>(
      notificationsListKey,
      (prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })),
    );
    queryClient.setQueryData<number>(unreadKey, 0);

    try {
      await markAllAsRead(effectiveUserType);
      toast.success("All notifications marked as read");
    } catch (error) {
      // Roll back optimistic update
      queryClient.setQueryData(notificationsListKey, prevList);
      queryClient.setQueryData(unreadKey, prevCount);
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
      isHardDisconnected,
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
      isHardDisconnected,
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
