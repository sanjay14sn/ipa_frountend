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

const NOTIFICATION_REDIRECT_MAP = {
  student_id_requested: "/admin/students?tab=ids",
  student_id_issued: "/admin/students?tab=ids",
  student_deactivated: "/admin/students?tab=ids",
  student_reactivated: "/admin/students?tab=ids",
  student_level_promoted: "/admin/students?tab=ids",
  student_level_stuck: "/admin/students?tab=ids",
  student_registered: "/admin/students?tab=ids",
  franchise_application_submitted: "/admin/franchise?tab=franchises",
  franchise_payment_pending: "/admin/operations?tab=payments",
  franchise_payment_received: "/admin/operations?tab=payments",
  franchise_payment_due: "/admin/operations?tab=payments",
  franchise_payment_confirmed: "/admin/operations?tab=payments",
  franchise_approved: "/admin/franchise?tab=applications",
  franchise_rejected: "/admin/franchise?tab=applications",
  ci_application_submitted: "/admin/course-instructors?tab=applications",
  ci_application_approved: "/admin/course-instructors?tab=applications",
  ci_application_rejected: "/admin/course-instructors?tab=applications",
  ci_training_requested: "/admin/course-instructors?tab=training",
  ci_training_approved: "/admin/course-instructors?tab=training",
  ci_training_rejected: "/admin/course-instructors?tab=training",
  ci_training_scheduled: "/admin/course-instructors?tab=training",
  certificate_requested: "/admin/students?tab=certificates",
  certificate_approved: "/admin/students?tab=certificates",
  certificate_rejected: "/admin/students?tab=certificates",
  certificate_sent: "/admin/students?tab=certificates",
  order_placed: "/admin/operations?tab=orders",
  order_updated: "/admin/operations?tab=orders",
  ORDER_PLACED: "/admin/operations?tab=orders",
  ORDER_CREATED: "/admin/operations?tab=orders",
  ORDER_SHIPPED: "/admin/operations?tab=orders",
  ORDER_CANCELLED: "/admin/operations?tab=orders",
  ORDER_BACKORDERED: "/admin/operations?tab=orders",
  SHIPMENT_CREATED: "/admin/operations?tab=orders",
  LOW_STOCK: "/admin/operations?tab=inventory",
  REPLENISHMENT_DRAFT_CREATED: "/admin/operations?tab=inventory",
  FRANCHISE_APPROVED: "/admin/franchise?tab=franchises",
  AGREEMENT_PENDING_SIGNATURE: "/admin/franchise?tab=franchises",
  PAYMENT_RECEIVED: "/admin/franchise?tab=franchises",
  RECEIVABLE_ITEM_PAID: "/admin/franchise?tab=franchises",
  RECEIVABLE_REMINDER: "/admin/franchise?tab=franchises",
  AGREEMENT_HOLD_APPLIED: "/admin/franchise?tab=franchises",
  AGREEMENT_HOLD_CLEARED: "/admin/franchise?tab=franchises",
  CI_CREDENTIALS_ISSUED: "/admin/course-instructors?tab=applications",
  CI_AGREEMENT_ISSUED: "/admin/course-instructors?tab=applications",
} as const;

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
    if (notification.action?.href) {
      return notification.action.href;
    }
    return NOTIFICATION_REDIRECT_MAP[notification.type as keyof typeof NOTIFICATION_REDIRECT_MAP];
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
          aria-label="Open notifications"
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
                        {notification.title || notification.message}
                      </p>
                      {notification.title && notification.message ? (
                        <p className="text-sm text-muted-foreground leading-snug">
                          {notification.message}
                        </p>
                      ) : null}
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
