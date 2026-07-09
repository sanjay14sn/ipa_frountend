"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/date-utils";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DataTable, StatusBadge } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import {
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
} from "@/components/shared";
import {
  getPaginatedAdminCourseInstructors,
  getAdminCITrainingProgress,
  type CourseInstructorData,
  type CITrainingProgress,
  type CITrainingProgressLevel,
} from "@/services/course-instructor.service";
import { AdminCIAgreementDialog } from "@/components/agreements/AdminCIAgreementDialog";
import { AdminTrainingProgressModal } from "@/components/shared/AdminTrainingProgressModal";

interface FranchiseCiListTableProps {
  franchiseId: string;
}

function fmtDate(value: Date | string | undefined): string {
  if (!value) return "N/A";
  return formatDate(value);
}

function AdminCIProgressContent({ instructorId }: { instructorId: number }) {
  const { data: progress, isLoading } = useQuery<CITrainingProgress | null>({
    queryKey: ["admin-ci-training-progress", instructorId],
    queryFn: () => getAdminCITrainingProgress(instructorId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Loading training progress...
      </div>
    );
  }

  if (!progress || !progress.trainings || progress.trainings.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No training levels registered for this instructor.
      </p>
    );
  }

  const totalTrainings = progress.totalTrainings ?? progress.trainings.length;
  const completedTrainings =
    progress.completedTrainings ??
    progress.trainings.filter((t) => t.isCompleted).length;
  const progressPct =
    progress.progress ??
    (totalTrainings > 0 ? (completedTrainings / totalTrainings) * 100 : 0);

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedTrainings} of {totalTrainings} completed</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Training levels — compact, no individual cards */}
      <div className="divide-y divide-border">
        {(progress.trainings ?? []).map((training: CITrainingProgressLevel) => (
          <div
            key={training.id ?? training.trainingLevelId}
            className="flex items-center justify-between py-1.5 gap-3"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-4 shrink-0 text-xs text-muted-foreground">
                {training.displayOrder}
              </span>
              <span className="text-sm text-card-foreground truncate">
                {training.trainingLevelName ?? `Level ${training.trainingLevelId}`}
              </span>
              {training.isCompleted && training.marks != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {training.marks}%
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {training.paid ? (
                <StatusBadge tone="success" label="Paid" className="text-xs px-1.5 py-0" />
              ) : (
                <StatusBadge tone="neutral" label="Unpaid" className="text-xs px-1.5 py-0" />
              )}
              {training.isCompleted && (
                <StatusBadge tone="success" label="Completed" className="text-xs px-1.5 py-0" />
              )}
              {training.isActive && !training.isCompleted && (
                <StatusBadge tone="warning" label="Active" className="text-xs px-1.5 py-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FranchiseCiListTable({ franchiseId }: FranchiseCiListTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [agreementInstructor, setAgreementInstructor] = useState<{
    id: number;
    name?: string;
    programId?: number;
  } | null>(null);
  const [progressModal, setProgressModal] = useState<{ id: number; name: string; programId: number } | null>(null);
  const limit = 10;

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
      franchiseId: franchiseId.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }),
    [currentPage, limit, searchTerm, sortBy, sortOrder, franchiseId, statusFilter],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ci-franchise", listParams],
    queryFn: () => getPaginatedAdminCourseInstructors(listParams),
    enabled: franchiseId.trim().length > 0,
  });

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const columns: DataTableColumn<CourseInstructorData>[] = useMemo(
    () => [
      {
        key: "instructor",
        header: "Instructor",
      },
      {
        key: "city",
        header: "City",
        render: (c) => c.city || "—",
      },
      {
        key: "status",
        header: "Status",
        className: "text-center",
        render: (c) => <StatusBadge label={c.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        className: "w-[110px]",
        render: (c) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="View training progress"
              aria-label="View training progress"
              onClick={() =>
                setProgressModal({
                  id: c.id,
                  name: c.name,
                  programId: c.programId,
                })
              }
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="View CI agreement"
              aria-label="View CI agreement"
              onClick={() =>
                setAgreementInstructor({
                  id: c.id,
                  name: c.name,
                  programId: c.programId,
                })
              }
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" },
        { value: "Training", label: "Training" },
        { value: "valid", label: "Valid (operational)" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "id", label: "ID" },
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Created" },
  ];

  return (
    <>
      <DataTable<CourseInstructorData>
        data={rows}
        loading={isLoading}
        columns={columns}
        getRowId={(c) => String(c.id)}
        renderMainCell={(c) => (
          <span className="font-medium text-card-foreground">
            {c.name}
            {c.instructorId ? (
              <span className="ml-2 text-xs text-muted-foreground">
                · {c.instructorId}
              </span>
            ) : null}
          </span>
        )}
        renderExpandedContent={(c) => (
          <div className="p-4">
            <ExpandedDetailSurface>
              <ExpandedDetailSection title="Course Instructor Information">
                <DetailFieldsGrid columns={3}>
                  <DetailField label="Instructor ID" value={c.instructorId || "N/A"} mono />
                  <DetailField label="Email"         value={c.mail || "N/A"} />
                  <DetailField label="Phone"         value={c.phone || "N/A"} />
                  <DetailField label="Date of birth" value={fmtDate(c.dob)} />
                  <DetailField label="Blood group"   value={c.bloodGroup || "N/A"} />
                  <DetailField label="Education"     value={c.education || "N/A"} />
                  <DetailField label="Occupation"    value={c.occupation || "N/A"} />
                  <DetailField label="Status"        value={c.status || "N/A"} />
                  <DetailField label="Address"       value={c.address || "N/A"} span={3} />
                </DetailFieldsGrid>
              </ExpandedDetailSection>

              <Separator />

              <ExpandedDetailSection title="Training Progress">
                <AdminCIProgressContent instructorId={c.id} />
              </ExpandedDetailSection>
            </ExpandedDetailSurface>
          </div>
        )}
        searchPlaceholder="Search by name, email, or phone..."
        onSearchChange={(s) => {
          setSearchTerm(s);
          setCurrentPage(1);
        }}
        filters={filters}
        onFilterChange={(key, value) => {
          if (key === "status") {
            setStatusFilter(Array.isArray(value) ? (value[0] ?? "all") : value);
            setCurrentPage(1);
          }
        }}
        sortOptions={sortOptions}
        defaultSortBy="id"
        defaultSortOrder="DESC"
        onSortChange={(by, ord) => {
          setSortBy(by);
          setSortOrder(ord as "ASC" | "DESC");
          setCurrentPage(1);
        }}
        pagination={{ total, totalPages }}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={limit}
        emptyMessage="No course instructors for this franchise."
        resultsText={(count, tot) =>
          `Showing ${count} of ${tot} instructor${tot === 1 ? "" : "s"}`
        }
      />

      <AdminCIAgreementDialog
        instructor={agreementInstructor}
        onClose={() => setAgreementInstructor(null)}
      />

      {progressModal && (
        <AdminTrainingProgressModal
          isOpen={true}
          onClose={() => setProgressModal(null)}
          instructorId={progressModal.id}
          instructorName={progressModal.name}
          programId={progressModal.programId}
        />
      )}
    </>
  );
}
