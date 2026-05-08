"use client";

import { useEffect, useRef, useState } from "react";
import type { UserType } from "../lib/notification.types";
import { getApiBaseUrl } from "@/lib/api-utils";

interface UseNotificationSseProps {
  userId: number | null;
  userType: UserType | null;
  onNotification?: (payload: unknown) => void;
}

function getStreamUrl(userType: UserType): string {
  const path =
    userType === "admin"
      ? "/admin/notification/stream"
      : "/notification/stream";
  return `${getApiBaseUrl()}${path}`;
}

export function useNotificationSse({
  userId,
  userType,
  onNotification,
}: UseNotificationSseProps) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId || !userType) {
      setIsConnected(false);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const eventSource = new EventSource(getStreamUrl(userType), {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    const handleNotification = (event: Event) => {
      const messageEvent = event as MessageEvent<string>;
      if (!messageEvent.data) return;

      try {
        onNotification?.(JSON.parse(messageEvent.data));
      } catch {
        onNotification?.(messageEvent.data);
      }
    };

    eventSource.addEventListener("notification", handleNotification);

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userId, userType, onNotification]);

  return { isConnected, eventSource: eventSourceRef.current };
}
