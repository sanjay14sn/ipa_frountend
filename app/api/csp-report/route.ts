import { NextRequest, NextResponse } from "next/server";
import { sendClientLog } from "@/lib/client-telemetry";

/**
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports sent by the browser when
 * `report-uri /api/csp-report` is included in the CSP header. Logs them via
 * the existing client-telemetry pipeline for visibility in production.
 *
 * The browser POSTs `application/csp-report` JSON (not `application/json`).
 * We parse it manually and forward relevant fields to telemetry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const report = JSON.parse(body) as {
      "csp-report"?: {
        "document-uri"?: string;
        "blocked-uri"?: string;
        "violated-directive"?: string;
        "effective-directive"?: string;
        "original-policy"?: string;
        "disposition"?: string;
      };
    };
    const csp = report["csp-report"] ?? {};

    // Log via sendClientLog so violations flow through the same pipeline as
    // other front-end errors. This is a server route so we call the API
    // endpoint directly rather than using the browser helper.
    console.warn("[csp-report]", {
      blockedUri: csp["blocked-uri"],
      violatedDirective: csp["violated-directive"],
      effectiveDirective: csp["effective-directive"],
      documentUri: csp["document-uri"],
      disposition: csp["disposition"],
    });
  } catch {
    // Malformed report — ignore silently.
  }

  // CSP reports expect a 2xx response; 204 is conventional.
  return new NextResponse(null, { status: 204 });
}
