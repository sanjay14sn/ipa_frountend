"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { sendClientLog } from "@/lib/client-telemetry";

export interface RouteErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  scope: "root" | "admin" | "franchisee" | "ci";
  /** "Go home" escape hatch; defaults per scope. */
  homeHref?: string;
  /** Root boundary renders full-viewport. */
  fullScreen?: boolean;
}

/**
 * The one route-error surface: telemetry effect + error card with Retry.
 * Route error.tsx files are thin wrappers over this. Telemetry event names
 * are byte-identical to the pre-revamp boundaries — do not rename.
 */
const SCOPE_EVENT: Record<RouteErrorStateProps["scope"], string> = {
  root: "route-error",
  admin: "admin-route-error",
  franchisee: "franchisee-route-error",
  ci: "ci-route-error",
};

const SCOPE_HOME: Record<RouteErrorStateProps["scope"], string> = {
  root: "/",
  admin: "/admin",
  franchisee: "/franchisee",
  ci: "/ci",
};

const SCOPE_MESSAGE: Record<RouteErrorStateProps["scope"], string> = {
  root: "An unexpected error occurred. Please try again.",
  admin: "An unexpected error occurred in this section. Please try again.",
  franchisee: "An unexpected error occurred in this section. Please try again.",
  ci: "An unexpected error occurred in this section. Please try again.",
};

export function RouteErrorState({
  error,
  reset,
  scope,
  homeHref,
  fullScreen = false,
}: RouteErrorStateProps) {
  const router = useRouter();

  useEffect(() => {
    sendClientLog({
      level: "error",
      event: SCOPE_EVENT[scope],
      message: error.message || `Unknown ${scope} route error`,
      context: { digest: error.digest, stack: error.stack },
    });
  }, [error, scope]);

  const resolvedHome = homeHref ?? SCOPE_HOME[scope];

  return (
    <div
      data-testid="route-error-state"
      className={cn(
        "flex flex-col items-center justify-center p-8",
        fullScreen ? "min-h-screen bg-background" : "min-h-[60vh]",
      )}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-primary">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {SCOPE_MESSAGE[scope]}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <button
            onClick={() => router.push(resolvedHome)}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            {scope === "root" ? "Go home" : "Back to dashboard"}
          </button>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
