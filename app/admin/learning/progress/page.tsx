"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  PageSkeleton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import {
  fetchAdminLearningProgress,
  type LearningProgressRow,
} from "@/services/learning.service";
import { formatDate } from "@/lib/date-utils";

function AdminProgressSection() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-learning-progress"],
    queryFn: () => fetchAdminLearningProgress(),
  });

  const columns: DataTableColumn<LearningProgressRow>[] = useMemo(
    () => [
      { key: "franchise", header: "Franchise", render: (row) => row.franchiseId ?? "—" },
      { key: "book", header: "Book", render: (row) => row.bookTitle },
      { key: "pages", header: "Pages", render: (row) => row.pages },
      { key: "assigned", header: "Assigned", render: (row) => formatDate(row.assignedDate) },
      { key: "due", header: "Due", render: (row) => formatDate(row.dueDate) },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={row.status === "COMPLETED" ? "default" : "outline"}>
            {row.status}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <TablePageShell
      title="Student Progress"
      description="View assignment progress across all franchises."
    >
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={rows}
          loading={isLoading}
          columns={columns}
          getRowId={(row) => `${row.assignmentId}-${row.studentId}`}
          renderMainCell={(row) => (
            <TableMainCell title={row.studentName ?? "Student"} subtitle={row.studentRollNo ?? undefined} />
          )}
          emptyMessage="No progress records yet."
        />
      )}
    </TablePageShell>
  );
}

export default function AdminLearningProgressPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminProgressSection />
    </Suspense>
  );
}
