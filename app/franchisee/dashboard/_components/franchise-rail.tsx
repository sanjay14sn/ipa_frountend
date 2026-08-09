"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import {
  cancelProgramRequest,
  listProgramRequests,
  type ProgramRequestItem,
} from "@/services/program-request.service";
import { queryKeys } from "@/hooks/api/query-keys";
import { useUser } from "@/context/user-context";
import { formatDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/error-utils";

function RailCard({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">{children}</CardContent>
    </Card>
  );
}

function RailSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 py-1">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-4 rounded bg-muted" />
      ))}
    </div>
  );
}

function ProgramsRailCard({ onRequestProgram }: { onRequestProgram: () => void }) {
  const { user } = useUser();
  const franchiseId = user?.franchiseId;
  const [cancelling, setCancelling] = useState<number | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.programRequests.franchisee({ franchiseId }),
    queryFn: async () => {
      const data = await listProgramRequests();
      return franchiseId
        ? data.filter((r) => r.franchiseId === franchiseId)
        : data;
    },
  });
  const requests = requestsQuery.data ?? [];

  const handleCancel = async (id: number) => {
    setCancelling(id);
    try {
      await cancelProgramRequest(id);
      toast.success("Request cancelled");
      void requestsQuery.refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel request"));
    } finally {
      setCancelling(null);
    }
  };

  return (
    <RailCard
      label="Programs"
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-primary"
          onClick={onRequestProgram}
        >
          <Plus className="h-3.5 w-3.5" />
          Request
        </Button>
      }
    >
      {requestsQuery.isLoading && requests.length === 0 ? (
        <RailSkeleton />
      ) : requests.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No program requests yet.
        </p>
      ) : (
        <div className="divide-y">
          {requests.map((r: ProgramRequestItem) => (
            <div key={r.id} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-card-foreground">
                  {r.program?.name ?? "—"}
                </p>
                {r.requestedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDate(r.requestedAt)}
                  </p>
                ) : null}
              </div>
              <StatusBadge label={r.status} />
              {r.status === "Pending" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Cancel request"
                  disabled={cancelling === r.id}
                  onClick={() => handleCancel(r.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </RailCard>
  );
}

export interface FranchiseRailProps {
  /** Opens the page-level RequestProgramsModal. */
  onRequestProgram: () => void;
}

/**
 * Program requests from the retired /franchisee/franchise page as a dashboard
 * rail card. The franchise agreement lives in the AgreementHero band; CI
 * agreements are handled on the Course Instructors page (view/sign row
 * actions), scoped to the active franchise.
 */
export function FranchiseRail({ onRequestProgram }: FranchiseRailProps) {
  return (
    <div data-testid="franchise-rail" className="grid grid-cols-1 gap-4">
      <ProgramsRailCard onRequestProgram={onRequestProgram} />
    </div>
  );
}
