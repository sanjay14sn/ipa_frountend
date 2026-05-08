"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart2 } from "lucide-react";
import { DataTable, TableLoadingState, TablePageShell, type DataTableColumn } from "@/components/shared";
import { getCIProgress, type CIProgressItem } from "@/services/ci-training.service";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  if (status === "COMPLETED") return <Badge>Completed</Badge>;
  if (status === "FAILED") return <Badge variant="destructive">Failed</Badge>;
  if (status === "ASSIGNED") return <Badge variant="secondary">Assigned</Badge>;
  if (status === "WAITING") return <Badge variant="outline">Waiting</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function CIProgressPage() {
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
    <TablePageShell
      title="Training progress"
      description="Track your progress across all training levels."
    >
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            {completed} of {progress.length} levels completed
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{
              width: progress.length > 0 ? `${(completed / progress.length) * 100}%` : "0%",
            }}
          />
        </div>
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
