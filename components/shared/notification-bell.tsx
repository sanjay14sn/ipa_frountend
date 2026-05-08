"use client";

import React, { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow, isValid } from "date-fns";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useNotifications } from "../../context/notification-context";
import { Notification } from "../../lib/notification.types";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const {
    notifications: notificationsRaw,
    unreadCount,
    isLoading,
    isConnected,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useNotifications();

  const notifications = Array.isArray(notificationsRaw)
    ? notificationsRaw
    : [];

  const [open, setOpen] = useState(false);
  const router = useRouter();

  const relativeTime = (createdAt: Notification["createdAt"]) => {
    const d =
      createdAt instanceof Date ? createdAt : new Date(createdAt as string);
    if (!isValid(d)) return "Recently";
    try {
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const getRedirectUrl = (notification: Notification) => {
    switch (notification.type) {
      // Student notifications
      case "student_id_requested":
      case "student_id_issued":
      case "student_deactivated":
      case "student_reactivated":
      case "student_level_promoted":
      case "student_level_stuck":
      case "student_registered":
        return "/admin/students?tab=ids";

      // Franchise notifications
      case "franchise_application_submitted":
        return "/admin/franchise?tab=franchises";
      case "franchise_payment_pending":
      case "franchise_payment_received":
      case "franchise_payment_due":
      case "franchise_payment_confirmed":
        return "/admin/operations?tab=payments";
      case "franchise_approved":
      case "franchise_rejected":
        return "/admin/franchise?tab=applications";

      // Course Instructor (CI) notifications
      case "ci_application_submitted":
      case "ci_application_approved":
      case "ci_application_rejected":
        return "/admin/course-instructors?tab=applications";
      case "ci_training_requested":
      case "ci_training_approved":
      case "ci_training_rejected":
      case "ci_training_scheduled":
        return "/admin/course-instructors?tab=training";

      // Certificate notifications
      case "certificate_requested":
      case "certificate_approved":
      case "certificate_rejected":
      case "certificate_sent":
        return "/admin/students?tab=certificates";

      // Order notifications
      case "order_placed":
      case "order_updated":
        return "/admin/operations?tab=orders";
      default:
        return undefined;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    const url = getRedirectUrl(notification);
    if (url) {
      router.push(url);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary hover:bg-accent hover:text-primary"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          {!isConnected && (
            <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-yellow-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {!isConnected && (
          <>
            <Separator />
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                Real-time notifications disconnected. Reconnecting...
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
