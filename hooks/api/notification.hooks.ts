"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "@/services/notification.service";
import type { UserType } from "@/lib/notification.types";
import { queryKeys } from "./query-keys";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/error-utils";

const NOTIFICATIONS_LIST_PREFIX = ["notifications", "list"] as const;

function listParams(unreadOnly: boolean, extra?: Record<string, unknown>) {
  return { unreadOnly, ...extra } as Record<string, unknown>;
}

export function useNotifications(
  userType: UserType,
  unreadOnly = false,
  extraListParams?: Record<string, unknown>,
) {
  return useQuery({
    queryKey:
      userType === "admin"
        ? queryKeys.notifications.admin(listParams(unreadOnly, extraListParams))
        : queryKeys.notifications.franchisee(
            listParams(unreadOnly, extraListParams),
          ),
    queryFn: () => getNotifications(userType, unreadOnly),
    staleTime: 60 * 1000,
  });
}

export function useUnreadNotificationCount(userType: UserType) {
  return useQuery({
    queryKey:
      userType === "admin"
        ? queryKeys.notifications.unreadAdmin
        : queryKeys.notifications.unreadFranchisee,
    queryFn: () => getUnreadCount(userType),
    staleTime: 60 * 1000,
  });
}

export function useMarkNotificationRead(userType: UserType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) =>
      markAsRead(userType, notificationId),
    onSuccess: () => {
      const unreadKey =
        userType === "admin"
          ? queryKeys.notifications.unreadAdmin
          : queryKeys.notifications.unreadFranchisee;
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: unreadKey });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useMarkAllNotificationsRead(userType: UserType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllAsRead(userType),
    onSuccess: () => {
      const unreadKey =
        userType === "admin"
          ? queryKeys.notifications.unreadAdmin
          : queryKeys.notifications.unreadFranchisee;
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: unreadKey });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useDeleteNotification(userType: UserType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: number) =>
      deleteNotification(userType, notificationId),
    onSuccess: () => {
      const unreadKey =
        userType === "admin"
          ? queryKeys.notifications.unreadAdmin
          : queryKeys.notifications.unreadFranchisee;
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_PREFIX });
      void qc.invalidateQueries({ queryKey: unreadKey });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
}
