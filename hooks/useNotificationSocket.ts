"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Notification, UserType } from "../lib/notification.types";
import { getApiBaseUrl } from "@/lib/api-utils";

interface UseNotificationSocketProps {
  userId: number | null;
  userType: UserType | null;
  onNotification?: (notification: Notification) => void;
}

export function useNotificationSocket({
  userId,
  userType,
  onNotification,
}: UseNotificationSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log("useNotificationSocket - userId:", userId, "userType:", userType);

    // Only connect if we have both userId and userType
    if (!userId || !userType) {
      console.log("useNotificationSocket - No userId or userType, skipping connection");
      return;
    }

    console.log("useNotificationSocket - Attempting to connect to WebSocket...");

    // Connect to WebSocket
    const socket = io(`${getApiBaseUrl()}/notifications`, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Register user with the socket
      socket.emit("register", { userId, userType });
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    // Listen for notifications
    socket.on("notification", (notification: Notification) => {
      console.log("Received notification:", notification);
      if (onNotification) {
        onNotification(notification);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit("unregister", { userId, userType });
        socket.disconnect();
      }
    };
  }, [userId, userType, onNotification]);

  return { isConnected, socket: socketRef.current };
}
