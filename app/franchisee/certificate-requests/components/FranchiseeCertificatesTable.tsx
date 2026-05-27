"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import {
  DataTable,
  DetailField,
  DetailFieldsGrid,
  ExpandedDetailSection,
  ExpandedDetailSurface,
  StatusBadge,
} from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { FranchiseeCertificate } from "@/services/student.service";
import { calculateAge } from "@/lib/date-utils";
import StudentCertificatesModal from "./StudentCertificatesModal";

interface FranchiseeCertificatesTableProps {
  certificates?: FranchiseeCertificate[];
  onRefresh?: () => void;
}

export default function FranchiseeCertificatesTable({
  certificates,
  onRefresh,
}: FranchiseeCertificatesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"requestDate" | "studentName" | "marks">(
    "requestDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<number | undefined>(undefined);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!certificates) return [];

    let filtered = certificates.filter((certificate) => {
      const matchesSearch =
        certificate.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        certificate.studentRollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        certificate.instructorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || certificate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "requestDate":
          comparison =
            new Date(a.requestDate).getTime() -
            new Date(b.requestDate).getTime();
          break;
        case "studentName":
          comparison = a.studentName.localeCompare(b.studentName);
          break;
        case "marks":
          const aDenominator = a.totalMarks || a.levelTotalMarks || 1;
          const bDenominator = b.totalMarks || b.levelTotalMarks || 1;
          const aPercentage = (a.marksObtained / aDenominator) * 100;
          const bPercentage = (b.marksObtained / bDenominator) * 100;
          comparison = aPercentage - bPercentage;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [certificates, searchTerm, statusFilter, sortBy, sortOrder]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };




  // Table configuration
  const columns: DataTableColumn<FranchiseeCertificate>[] = [
    {
      key: "student",
      header: "Student",
    },
    {
      key: "percentage",
      header: "%",
      className: "text-center",
      render: (certificate) => {
        const denom =
          certificate.totalMarks || certificate.levelTotalMarks || 0;
        return denom > 0
          ? `${((certificate.marksObtained / denom) * 100).toFixed(1)}%`
          : "—";
      },
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (certificate) => <StatusBadge label={certificate.status} />,
    },
    {
      key: "dispatch",
      header: "Dispatch",
      className: "text-center",
      render: (certificate) =>
        certificate.dispatchStatus === "Dispatched" ? (
          <StatusBadge
            tone="success"
            label={`Dispatched${certificate.dispatchedAt ? ` ${new Date(certificate.dispatchedAt).toLocaleDateString()}` : ""}`}
          />
        ) : (
          <StatusBadge tone="neutral" label="Not dispatched" />
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (certificate) => (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="View certificate"
          aria-label="View certificate"
          onClick={() => {
            setSelectedStudentId(certificate.studentId);
            setSelectedCertificateId(certificate.id);
            setIsCertificatesModalOpen(true);
          }}
        >
          <Award className="h-4 w-4 text-primary" />
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "Pending", label: "Pending" },
        { value: "Issued", label: "Issued" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "requestDate", label: "Request Date" },
    { value: "studentName", label: "Student Name" },
    { value: "marks", label: "Marks" },
  ];

  return (
    <>
    <DataTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(certificate) => certificate.id.toString()}
      renderMainCell={(certificate) => (
        <span className="font-medium text-gray-900">
          {certificate.studentName}
          <span className="ml-2 text-xs text-muted-foreground">
            · {certificate.studentRollNo}
          </span>
        </span>
      )}
      renderExpandedContent={(certificate) => {
        const denom =
          certificate.totalMarks || certificate.levelTotalMarks || 0;
        const pct =
          denom > 0
            ? `${((certificate.marksObtained / denom) * 100).toFixed(1)}%`
            : "—";
        return (
          <ExpandedDetailSurface>
            <ExpandedDetailSection title="Student">
              <DetailFieldsGrid columns={4}>
                <DetailField
                  label="Level"
                  value={
                    <Badge
                      className={`${getLevelColor(certificate.studentLevel)} border text-xs`}
                    >
                      {certificate.studentLevel}
                    </Badge>
                  }
                />
                <DetailField label="Standard" value={certificate.studentStandard} />
                <DetailField label="Stream" value={certificate.studentStream || "—"} />
                <DetailField label="Sex" value={certificate.studentSex || "—"} />
                <DetailField
                  label="Age"
                  value={String(calculateAge(certificate.studentDateOfBirth))}
                />
                <DetailField
                  label="Date of birth"
                  value={
                    certificate.studentDateOfBirth
                      ? new Date(certificate.studentDateOfBirth).toLocaleDateString()
                      : "—"
                  }
                />
              </DetailFieldsGrid>
            </ExpandedDetailSection>

            <ExpandedDetailSection title="Certificate">
              <DetailFieldsGrid columns={4}>
                <DetailField
                  label="Instructor"
                  value={certificate.instructorName}
                />
                <DetailField
                  label="Instructor ID"
                  value={certificate.instructorInstructorId}
                />
                <DetailField
                  label="Marks"
                  value={`${certificate.marksObtained} / ${certificate.totalMarks || certificate.levelTotalMarks || 0}`}
                />
                <DetailField label="Percentage" value={pct} />
                <DetailField
                  label="Pass mark"
                  value={String(certificate.levelPassMark || 0)}
                />
                <DetailField
                  label="Requested"
                  value={
                    certificate.requestDate
                      ? new Date(certificate.requestDate).toLocaleDateString()
                      : "—"
                  }
                />
                <DetailField
                  label="Issued"
                  value={
                    certificate.issueDate
                      ? new Date(certificate.issueDate).toLocaleDateString()
                      : "—"
                  }
                />
              </DetailFieldsGrid>
            </ExpandedDetailSection>
          </ExpandedDetailSurface>
        );
      }}
      searchPlaceholder="Search by student name, roll number, or instructor..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="requestDate"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "requestDate" | "studentName" | "marks");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredAndSortedData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No certificates found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} certificates`
      }
    />

    {selectedStudentId && (
      <StudentCertificatesModal
        open={isCertificatesModalOpen}
        onOpenChange={(open) => {
          setIsCertificatesModalOpen(open);
          if (!open) {
            setSelectedStudentId(null);
            setSelectedCertificateId(undefined);
          }
        }}
        studentId={selectedStudentId}
        certificateId={selectedCertificateId}
      />
    )}
  </>
  );
}
