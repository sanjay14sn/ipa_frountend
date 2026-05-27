"use client";

/**
 * components/providers/web-vitals-reporter.tsx
 *
 * Sends Core Web Vitals to the client telemetry endpoint via `sendClientLog`.
 * Mount once in the root layout (outside of any Suspense boundary so it
 * receives metrics for the full page, not just a segment).
 *
 * Metrics emitted: CLS, INP, FCP, LCP, TTFB.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/analytics
 */

import { useReportWebVitals } from "next/web-vitals";
import { sendClientLog } from "@/lib/client-telemetry";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    sendClientLog({
      level: "info",
      event: "web-vitals",
      message: `${metric.name} = ${metric.value.toFixed(2)}`,
      context: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    });
  });

  return null;
}
