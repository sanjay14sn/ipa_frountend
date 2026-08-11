"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";
import { BarChart2, Eye, PenLine } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { CourseInstructorData } from "@/services/course-instructor.service";
import type { CIAgreementData } from "@/services/contracting.service";
import CourseInstructorDetails from "./CourseInstructorDetails";
import { TrainingProgressModal } from "@/components/ci-training/TrainingProgressModal";
import {
  CISignDialog,
  CIViewDialog,
  useCIAgreementsByInstructor,
} from "./ci-agreement-dialogs";

interface CourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
}

export default function CourseInstructorsTable({
  courseInstructors,
  loading = false,
  error,
  onRetry,
}: CourseInstructorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "city">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [progressModal, setProgressModal] = useState<{ id: number; name: string } | null>(null);
  // CI agreements of the ACTIVE franchise, mapped per instructor — powers the
  // view/sign row actions that used to live on the dashboard's CI card.
  const { byInstructor: agreementsByInstructor, refetch: refetchAgreements } =
    useCIAgreementsByInstructor();
  const [signingAgreement, setSigningAgreement] = useState<CIAgreementData | null>(null);
  const [viewingAgreementId, setViewingAgreementId] = useState<number | null>(null);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!courseInstructors) return [];

    let filtered = courseInstructors.filter((ci) => {
      const matchesSearch =
        ci.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.instructorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.mail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ci.education.toLowerCase().includes(searchTerm.toLowerCase());

      // Operational standing (valid/expired/void) is derived from the CI
      // agreement now, not the review status column.
      const matchesStatus =
        statusFilter === "all" ||
        (ci.operationalStatus ?? "void") === statusFilter;

      const matchesCity = cityFilter === "all" || ci.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "dateJoined":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "city":
          comparison = a.city.localeCompare(b.city);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [courseInstructors, searchTerm, statusFilter, cityFilter, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);


  const uniqueCities = [
    ...new Set(courseInstructors?.map((ci) => ci.city).filter(Boolean)),
  ];

  const columns: DataTableColumn<CourseInstructorData>[] = [
    {
      key: "instructor",
      header: "Instructor",
    },
    // FR-15: no per-row eligibility column — it fired one training-progress
    // request per row. Levels live in the expanded details and the progress
    // modal, both of which fetch on demand.
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (ci) => <StatusBadge label={ci.operationalStatus ?? "void"} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[120px]",
      render: (ci) => {
        const agreement = agreementsByInstructor.get(ci.id);
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="View training progress"
              aria-label="View training progress"
              onClick={() => setProgressModal({ id: ci.id, name: ci.name })}
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
            {agreement ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="View CI agreement"
                aria-label="View CI agreement"
                onClick={() => setViewingAgreementId(agreement.id)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            ) : null}
            {agreement?.phase === "PENDING_FRANCHISEE_SIGNATURE" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Sign CI agreement"
                aria-label="Sign CI agreement"
                onClick={() => setSigningAgreement(agreement)}
              >
                <PenLine className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "valid", label: "Valid" },
        { value: "expired", label: "Expired" },
        { value: "void", label: "Void" },
      ],
      defaultValue: "all",
    },
    {
      key: "city",
      label: "City",
      options: [
        { value: "all", label: "All Cities" },
        ...uniqueCities.map((city) => ({ value: city, label: city })),
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "dateJoined", label: "Date Joined" },
    { value: "name", label: "Name" },
    { value: "city", label: "City" },
  ];

  return (
    <>
    <DataTable
      data={paginatedData}
      loading={loading}
      columns={columns}
      getRowId={(ci) => ci.id.toString()}
      renderMainCell={(ci) => (
        <span className="font-medium text-card-foreground">
          {ci.name}
          {ci.instructorId ? (
            <span className="ml-2 text-xs text-muted-foreground">
              · {ci.instructorId}
            </span>
          ) : null}
          {/* Multi-franchise CI handled by another franchise — visible +
              certificate-eligible here, but not orderable/assignable.
              Renders nothing while the backend omits isHandler. */}
          {ci.isHandler === false ? (
            <Badge variant="secondary" className="ml-2 align-middle">
              Partner franchise
            </Badge>
          ) : null}
        </span>
      )}
      renderExpandedContent={(ci) => (
        <CourseInstructorDetails courseInstructor={ci} />
      )}
      searchPlaceholder="Search course instructors, instructor IDs, or contact info..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        else if (key === "city") setCityFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="dateJoined"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "name" | "dateJoined" | "city");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      error={error}
      onRetry={onRetry}
      errorMessage="Couldn't load course instructors."
      emptyMessage="No course instructors found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} course instructors`
      }
    />

    {progressModal && (
      <TrainingProgressModal
        isOpen={true}
        onClose={() => setProgressModal(null)}
        instructorId={progressModal.id}
        instructorName={progressModal.name}
      />
    )}

    <CISignDialog
      agreement={signingAgreement}
      onSigned={() => {
        setSigningAgreement(null);
        void refetchAgreements();
      }}
      onClose={() => setSigningAgreement(null)}
    />

    <CIViewDialog
      agreementId={viewingAgreementId}
      onClose={() => setViewingAgreementId(null)}
    />
    </>
  );
}
