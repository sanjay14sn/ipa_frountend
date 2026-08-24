"use client";

import { Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTable,
  PageSkeleton,
  TableMainCell,
  TablePageShell,
  type DataTableColumn,
} from "@/components/shared";
import {
  fetchFranchiseLearningProgress,
  type LearningProgressRow,
} from "@/services/learning.service";
import { formatDate } from "@/lib/date-utils";

function ProgressSection() {
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["franchise-learning-progress"],
    queryFn: () => fetchFranchiseLearningProgress(),
  });

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? rows
        : rows.filter((row) => row.status === statusFilter),
    [rows, statusFilter],
  );

  const columns: DataTableColumn<LearningProgressRow>[] = useMemo(
    () => [
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
      description="Track assignment completion across your students."
    >
      <div className="mb-4 max-w-xs">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <DataTable
          data={filtered}
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

export default function FranchiseProgressPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProgressSection />
    </Suspense>
  );
}
