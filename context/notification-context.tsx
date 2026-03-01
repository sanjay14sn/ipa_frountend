"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Notification, UserType } from "../lib/notification.types";
import { useNotificationSocket } from "../hooks/useNotificationSocket";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notification.service";
import { toast } from "sonner";
import { useUser } from "./user-context";

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

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get user from UserContext
  const { user } = useUser();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/admin-login";

  const userId = user?.id ? parseInt(user.id) : null;
  const userType = user?.role as UserType | null;

  // Don't fetch/connect on login pages
  const effectiveUserId = isLoginPage ? null : userId;
  const effectiveUserType = isLoginPage ? null : userType;

  useEffect(() => {
    console.log("NotificationContext - user from context:", user);
    console.log("NotificationContext - userId:", userId, "userType:", userType);
  }, [user, userId, userType]);

  // Handle incoming notifications from WebSocket
  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Show toast notification
    toast.info(notification.message, {
      duration: 5000,
    });
  }, []);

  // Connect to WebSocket (skip on login pages)
  const { isConnected } = useNotificationSocket({
    userId: effectiveUserId,
    userType: effectiveUserType,
    onNotification: handleNewNotification,
  });

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userType) return;

    setIsLoading(true);
    try {
      const data = await getNotifications(userType);
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [userType]);

  // Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!userType) return;

    try {
      const count = await getUnreadCount(userType);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, [userType]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    if (!userType) return;

    try {
      await markAsRead(userType, notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  }, [userType]);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!userType) return;

    try {
      await markAllAsRead(userType);
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  }, [userType]);

  // Initial fetch on mount (skip on login pages)
  useEffect(() => {
    if (effectiveUserId && effectiveUserType) {
      fetchNotifications();
      refreshUnreadCount();
    }
  }, [effectiveUserId, effectiveUserType, fetchNotifications, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isConnected,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
