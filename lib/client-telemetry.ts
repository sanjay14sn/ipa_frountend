export type ClientLogLevel = "error" | "warn" | "info";

export interface ClientLogPayload {
  level: ClientLogLevel;
  event: string;
  message: string;
  url?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

function trimValue(value: string | undefined, max = 1000): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function stripQuery(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.split("?")[0];
}

export function sendClientLog(payload: ClientLogPayload): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_CLIENT_TELEMETRY_ENABLED === "false") return;

  const body = JSON.stringify({
    ...payload,
    message: trimValue(payload.message),
    url: stripQuery(payload.url),
    stack: trimValue(payload.stack, 3000),
    href: stripQuery(window.location.href),
    userAgent: window.navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(
      "/api/client-log",
      new Blob([body], { type: "application/json" }),
    );
    if (sent) return;
  }

  void fetch("/api/client-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Logging must never interrupt the user flow.
  });
}
