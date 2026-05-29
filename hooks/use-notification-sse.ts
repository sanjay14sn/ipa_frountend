"use client";

import { useEffect, useRef, useState } from "react";
import type { UserType } from "../lib/notification.types";
import { getApiBaseUrl } from "@/lib/api-utils";

const MAX_RETRIES = 5;

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
  const [isHardDisconnected, setIsHardDisconnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!userId || !userType) {
      setIsConnected(false);
      setIsHardDisconnected(false);
      retryCountRef.current = 0;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    // Don't attempt a new connection if we've already hard-disconnected
    if (isHardDisconnected) {
      return;
    }

    const eventSource = new EventSource(getStreamUrl(userType), {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsHardDisconnected(false);
      // Reset retry counter on successful connection
      retryCountRef.current = 0;
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      retryCountRef.current += 1;

      if (retryCountRef.current >= MAX_RETRIES) {
        // Stop the browser's automatic reconnect attempts
        eventSource.close();
        eventSourceRef.current = null;
        setIsHardDisconnected(true);
      }
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
  // isHardDisconnected intentionally omitted — it only blocks re-entry, it must not trigger re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userType, onNotification]);

  return { isConnected, isHardDisconnected, eventSource: eventSourceRef.current };
}
