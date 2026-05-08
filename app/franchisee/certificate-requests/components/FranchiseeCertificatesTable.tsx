"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Award } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
  DataTableSortOption,
} from "@/components/shared";
import { FranchiseeCertificate } from "@/services/student.service";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Issued":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };


  // Table configuration
  const columns: DataTableColumn<FranchiseeCertificate>[] = [
    {
      key: "student",
      header: "Student",
      className: "w-[250px]",
    },
    {
      key: "instructor",
      header: "Instructor",
      className: "text-center",
      render: (certificate) => (
        <div className="text-sm">
          <div className="font-medium">{certificate.instructorName}</div>
          <div className="text-gray-500">ID: {certificate.instructorInstructorId}</div>
        </div>
      ),
    },
    {
      key: "marks",
      header: "Marks & Percentage",
      className: "text-center",
      render: (certificate) => (
        <div className="text-sm">
          <div className="font-medium">
            {certificate.marksObtained}/{certificate.totalMarks || certificate.levelTotalMarks || 0}
          </div>
          <div className="text-gray-500">
            {(certificate.totalMarks || certificate.levelTotalMarks || 0) > 0
              ? `${((certificate.marksObtained / (certificate.totalMarks || certificate.levelTotalMarks)) * 100).toFixed(1)}%`
              : "N/A"}
          </div>
          <div className="text-xs text-gray-500">
            {"Pass >= "}{certificate.levelPassMark || 0}
          </div>
        </div>
      ),
    },
    {
      key: "requestDate",
      header: "Request Date",
      className: "text-center",
      render: (certificate) => (
        <div className="text-sm">
          <div className="flex items-center justify-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{new Date(certificate.requestDate).toLocaleDateString()}</span>
          </div>
          {certificate.issueDate && (
            <div className="text-xs text-gray-500 mt-1">
              Issued: {new Date(certificate.issueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (certificate) => (
        <Badge className={`${getStatusColor(certificate.status)} border`}>
          {certificate.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (certificate) => (
        <Button
          size="sm"
          onClick={() => {
            setSelectedStudentId(certificate.studentId);
            setSelectedCertificateId(certificate.id);
            setIsCertificatesModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
          title="View Certificate"
        >
          <Award className="w-4 h-4 mr-1" />
          View Certificate
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
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{certificate.studentName}</div>
          <div className="text-sm text-gray-500">
            {certificate.studentRollNo} • Age{" "}
            {calculateAge(certificate.studentDateOfBirth)} • {certificate.studentSex}
          </div>
          <div className="text-xs text-primary font-medium">
            {certificate.studentStandard} • {certificate.studentStream}
          </div>
          <Badge
            className={`${getLevelColor(
              certificate.studentLevel
            )} border text-xs mt-1 w-fit`}
          >
            {certificate.studentLevel}
          </Badge>
        </div>
      )}
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
