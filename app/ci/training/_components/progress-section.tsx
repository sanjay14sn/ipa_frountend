"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart2 } from "lucide-react";
import { DataTable, TableLoadingState, TablePageShell, type DataTableColumn } from "@/components/shared";
import { getCIProgress, type CIProgressItem } from "@/services/ci-training.service";
import { formatDate } from "@/lib/date-utils";
import { Progress } from "@/components/ui/progress";

function statusBadge(status: string) {
  if (status === "COMPLETED") return <Badge>Completed</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  if (status === "ASSIGNED") return <Badge variant="secondary">Assigned</Badge>;
  if (status === "WAITING") return <Badge variant="outline">Waiting</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

// CI-02: title-stripped tab section — the /ci/training hub owns the header (R6).
export function ProgressSection() {
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ["ci-progress"],
    queryFn: getCIProgress,
  });

  const completed = useMemo(
    () => progress.filter((item) => item.status === "COMPLETED").length,
    [progress],
  );

  const columns: DataTableColumn<CIProgressItem>[] = [
    {
      key: "status",
      header: "Status",
      render: (item) => statusBadge(item.status),
    },
    {
      key: "sessionDate",
      header: "Session Date",
      render: (item) => formatDate(item.sessionDate),
    },
    {
      key: "theory",
      header: "Theory",
      render: (item) => item.theoryMarks ?? "-",
    },
    {
      key: "practical",
      header: "Practical",
      render: (item) => item.practicalMarks ?? "-",
    },
    {
      key: "completedAt",
      header: "Completed At",
      render: (item) => formatDate(item.completedAt),
    },
  ];

  return (
    <TablePageShell embed>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            {completed} of {progress.length} levels completed
          </p>
        </div>
        <Progress
          className="mt-3 h-2 [&>div]:bg-success"
          value={progress.length > 0 ? (completed / progress.length) * 100 : 0}
        />
      </div>

      {isLoading && progress.length === 0 ? (
        <TableLoadingState message="Loading progress..." />
      ) : (
        <DataTable<CIProgressItem>
          data={progress}
          loading={isLoading}
          columns={columns}
          getRowId={(item) => `${item.trainingLevelId}-${item.status}`}
          renderMainCell={(item) => (
            <div className="flex flex-col">
              <span className="font-medium text-card-foreground">{item.trainingLevelName}</span>
              <span className="text-sm text-muted-foreground">Level {item.trainingLevelId}</span>
            </div>
          )}
          emptyMessage="No training progress yet. Purchase a package to get started."
          resultsText={(count, total) => `Showing ${count} of ${total} training levels`}
        />
      )}
    </TablePageShell>
  );
}
