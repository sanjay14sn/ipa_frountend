import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_BYTES = 10_000;

type ClientLogLevel = "error" | "warn" | "info";

interface ClientLogBody {
  level?: ClientLogLevel;
  event?: string;
  message?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  href?: string;
  userAgent?: string;
  stack?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

function truncate(value: unknown, max = 1000): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export async function POST(request: NextRequest) {
  if (process.env.FRONTEND_TELEMETRY_ENABLED === "false") {
    return NextResponse.json({ ok: true });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let body: ClientLogBody;
  try {
    body = (await request.json()) as ClientLogBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entry = {
    service: process.env.LOG_APP_NAME || "ipa-frontend",
    level: body.level || "error",
    event: truncate(body.event, 120) || "client_log",
    message: truncate(body.message) || "Client event",
    url: truncate(body.url, 500),
    method: truncate(body.method, 12),
    statusCode: body.statusCode,
    requestId: truncate(body.requestId, 120),
    href: truncate(body.href, 500),
    userAgent: truncate(body.userAgent, 300),
    stack: truncate(body.stack, 3000),
    timestamp: body.timestamp || new Date().toISOString(),
    context: body.context,
  };

  const line = JSON.stringify(entry);
  if (entry.level === "warn") {
    console.warn(line);
  } else if (entry.level === "info") {
    console.info(line);
  } else {
    console.error(line);
  }

  return NextResponse.json({ ok: true });
}
