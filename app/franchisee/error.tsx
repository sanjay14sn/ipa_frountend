"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendClientLog } from "@/lib/client-telemetry";

export default function FranchiseeErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    sendClientLog({
      level: "error",
      event: "franchisee-route-error",
      message: error.message || "Unknown franchisee route error",
      context: { digest: error.digest, stack: error.stack },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-primary">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          An unexpected error occurred in this section. Please try again.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/franchisee")}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
          >
            Back to dashboard
          </button>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-muted-foreground">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
