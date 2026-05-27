import path from "node:path";
import { fileURLToPath } from "node:url";
import withBundleAnalyzerFactory from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Origin of the REST/Socket.IO backend — required in CSP `connect-src` so the
 * browser allows XHR/fetch/WebSocket to the API (blockedUri in `/api/csp-report`).
 * Matches `NEXT_PUBLIC_API_URL` fallback in `lib/config.ts` for local dev.
 */
function getApiOriginForCsp() {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      return null;
    }
  }
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:5500";
  }
  return null;
}

/**
 * Content Security Policy — Report-Only first.
 *
 * Deploy this for at least 2 weeks and monitor the CSP report endpoint
 * (`/api/csp-report`) before switching from `Content-Security-Policy-Report-Only`
 * to `Content-Security-Policy`. Set NEXT_PUBLIC_CSP_ENFORCE=true in the env
 * to flip to enforcing mode when the reports are clean.
 */
function buildCsp() {
  const apiOrigin = getApiOriginForCsp();
  const connectSources = [
    "'self'",
    "wss:",
    "ws:",
    "https://checkout.razorpay.com",
    ...(apiOrigin ? [apiOrigin] : []),
  ];

  const directives = [
    "default-src 'self'",
    // Scripts: self + Next.js inline chunks + Razorpay checkout
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    // Styles: self + inline (Tailwind generates inline styles in some modes)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
    // Images: self + data URIs (signatures stored as data:image/svg+xml)
    "img-src 'self' data: blob: https:",
    // Connections: frontend + Razorpay + backend API (+ ws schemes for socket.io)
    `connect-src ${connectSources.join(" ")}`,
    // Frames: Razorpay payment modal
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ].join("; ");
  return directives;
}

const isProduction = process.env.NODE_ENV === "production";
const enforceCsp = process.env.NEXT_PUBLIC_CSP_ENFORCE === "true";

const securityHeaders = [
  // Start in report-only mode; switch to Content-Security-Policy when clean.
  {
    key: enforceCsp
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    value: buildCsp(),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // HSTS — only in production (breaks localhost dev with https)
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Keep unoptimized for now. Signature images are served by the API server
    // behind httpOnly session cookies — the Next.js optimization proxy can't
    // forward those credentials. Flip to `false` and add `remotePatterns` only
    // after migrating to a public CDN or a signed-URL approach for signatures.
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Run `ANALYZE=true pnpm build` to open bundle analysis in the browser.
const withBundleAnalyzer = withBundleAnalyzerFactory({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
});

export default withBundleAnalyzer(nextConfig);
