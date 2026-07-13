"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { DataTable, TableLoadingState, TablePageShell, type DataTableColumn } from "@/components/shared";
import { getCIUpcomingSessions, type CIUpcomingSession } from "@/services/ci-training.service";
import { formatDate } from "@/lib/date-utils";

function statusBadge(status: string) {
  if (status === "ASSIGNED") return <Badge>Assigned</Badge>;
  if (status === "WAITING") return <Badge variant="outline">Waiting</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// CI-02: title-stripped tab section — the /ci/training hub owns the header (R6).
export function UpcomingSection() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ci-upcoming"],
    queryFn: getCIUpcomingSessions,
  });

  const sorted = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const d1 = new Date(a.sessionDate).getTime();
        const d2 = new Date(b.sessionDate).getTime();
        return d1 - d2;
      }),
    [sessions],
  );

  const columns: DataTableColumn<CIUpcomingSession>[] = [
    {
      key: "date",
      header: "Date",
      render: (item) => formatDate(item.sessionDate),
    },
    {
      key: "region",
      header: "State / Region",
      render: (item) => item.region,
    },
    {
      key: "venue",
      header: "Venue",
      render: (item) => item.venue ?? "-",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => statusBadge(item.assignmentStatus),
    },
  ];

  return (
    <TablePageShell embed>
      {isLoading && sessions.length === 0 ? (
        <TableLoadingState message="Loading upcoming sessions..." />
      ) : (
        <DataTable<CIUpcomingSession>
          data={sorted}
          loading={isLoading}
          columns={columns}
          getRowId={(item) => String(item.sessionId)}
          renderMainCell={(item) => (
            <div className="flex flex-col">
              <span className="font-medium text-card-foreground">
                {item.trainingLevelName ?? `Level ${item.trainingLevelId}`}
              </span>
              <span className="text-sm text-muted-foreground">Session #{item.sessionId}</span>
            </div>
          )}
          emptyMessage="No upcoming sessions found."
          resultsText={(count, total) => `Showing ${count} of ${total} upcoming sessions`}
        />
      )}
    </TablePageShell>
  );
}
