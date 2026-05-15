"use client";

import { useEffect } from "react";
import { sendClientLog } from "@/lib/client-telemetry";

export function ClientTelemetryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      sendClientLog({
        level: "error",
        event: "window_error",
        message: event.message || "Unhandled browser error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      sendClientLog({
        level: "error",
        event: "unhandled_rejection",
        message:
          reason instanceof Error
            ? reason.message
            : "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
