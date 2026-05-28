"use client";

import { useEffect } from "react";
import { sendClientLog } from "@/lib/client-telemetry";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    sendClientLog({
      level: "error",
      event: "global-error",
      message: error.message || "Unknown global error",
      context: { digest: error.digest, stack: error.stack },
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#fafafa" }}>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}>
          <div style={{
            width: "100%",
            maxWidth: "28rem",
            borderRadius: "0.75rem",
            border: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}>
            <h1 style={{ color: "#064e3b", fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Critical error
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              The application encountered an unrecoverable error.
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: "#064e3b",
                color: "#ffffff",
                padding: "0.625rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
