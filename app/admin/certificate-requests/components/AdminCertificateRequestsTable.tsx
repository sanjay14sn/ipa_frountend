"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  AdminCertificateRequest,
  AdminCertificateRequestsByFranchise,
} from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";
import {
  approveCertificateRequestWithRevalidation,
  rejectCertificateRequestWithRevalidation,
} from "@/hooks/use-students";

interface AdminCertificateRequestsTableProps {
  certificateRequestsByFranchise?: AdminCertificateRequestsByFranchise;
  onRefresh?: () => void;
}

export default function AdminCertificateRequestsTable({
  certificateRequestsByFranchise,
  onRefresh,
}: AdminCertificateRequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [franchiseFilter, setFranchiseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"requestDate" | "studentName" | "marks">(
    "requestDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Flatten the grouped data into a single array
  const allRequests = useMemo(() => {
    if (!certificateRequestsByFranchise) return [];
    return Object.values(certificateRequestsByFranchise).flat();
  }, [certificateRequestsByFranchise]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = allRequests.filter((request) => {
      const matchesSearch =
        request.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.studentRollNo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.instructorName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.franchiseName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = request.status === statusFilter;

      const matchesFranchise =
        franchiseFilter === "all" || request.franchiseName === franchiseFilter;

      return matchesSearch && matchesStatus && matchesFranchise;
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
          const aPercentage = (a.marksObtained / a.totalMarks) * 100;
          const bPercentage = (b.marksObtained / b.totalMarks) * 100;
          comparison = aPercentage - bPercentage;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    allRequests,
    searchTerm,
    statusFilter,
    franchiseFilter,
    sortBy,
    sortOrder,
  ]);

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
      case "Approved":
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

  // Get unique values for filters
  const uniqueFranchises = [
    ...new Set(
      allRequests?.map((request) => request.franchiseName).filter(Boolean)
    ),
  ];

  const handleApprove = async (requestId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request approved successfully",
      });
      onRefresh?.();
    } catch (error) {
      console.error("Error approving certificate request:", error);
      toast({
        title: "Error",
        description: "Failed to approve certificate request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request rejected successfully",
      });
      onRefresh?.();
    } catch (error) {
      console.error("Error rejecting certificate request:", error);
      toast({
        title: "Error",
        description: "Failed to reject certificate request",
        variant: "destructive",
      });
    }
  };

  // Table configuration
  const columns: AdminTableColumn<AdminCertificateRequest>[] = [
    {
      key: "student",
      header: "Student",
      className: "w-[250px]",
    },
    {
      key: "instructor",
      header: "Instructor",
      className: "text-center",
      render: (request) => (
        <div className="text-sm">
          <div className="font-medium">{request.instructorName}</div>
          <div className="text-gray-500">ID: {request.instructorId}</div>
        </div>
      ),
    },
    {
      key: "franchise",
      header: "Franchise",
      className: "text-center",
      render: (request) => (
        <div className="text-sm font-medium">{request.franchiseName}</div>
      ),
    },
    {
      key: "marks",
      header: "Marks & Percentage",
      className: "text-center",
      render: (request) => (
        <div className="text-sm">
          <div className="font-medium">
            {request.marksObtained}/{request.totalMarks}
          </div>
          <div className="text-gray-500">
            {((request.marksObtained / request.totalMarks) * 100).toFixed(1)}%
          </div>
        </div>
      ),
    },
    {
      key: "requestDate",
      header: "Request Date",
      className: "text-center",
      render: (request) => (
        <div className="text-sm">
          <div className="flex items-center justify-center">
            <Calendar className="w-3 h-3 mr-1" />
            <span>{new Date(request.requestDate).toLocaleDateString()}</span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(request.requestDate).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (request) => (
        <Badge className={`${getStatusColor(request.status)} border`}>
          {request.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (request) =>
        request.status === "Pending" ? (
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              onClick={() => handleApprove(request.id)}
              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
              title="Approve"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(request.id)}
              className="h-8 w-8 p-0"
              title="Reject"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Badge className={`${getStatusColor(request.status)} border`}>
            {request.status}
          </Badge>
        ),
    },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Approved", label: "Approved" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "Pending",
    },
    {
      key: "franchise",
      label: "Franchise",
      options: [
        { value: "all", label: "All Franchises" },
        ...uniqueFranchises.map((franchise) => ({
          value: franchise,
          label: franchise,
        })),
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "requestDate", label: "Request Date" },
    { value: "studentName", label: "Student Name" },
    { value: "marks", label: "Marks" },
  ];

  return (
    <AdminTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(request) => request.id.toString()}
      renderMainCell={(request) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{request.studentName}</div>
          <div className="text-sm text-gray-500">
            {request.studentRollNo} • Age{" "}
            {calculateAge(request.studentDateOfBirth)} • {request.studentSex}
          </div>
          <div className="text-xs text-primary font-medium">
            {request.studentStandard} • {request.studentStream}
          </div>
          <Badge
            className={`${getLevelColor(
              request.studentLevel
            )} border text-xs mt-1 w-fit`}
          >
            {request.studentLevel}
          </Badge>
        </div>
      )}
      searchPlaceholder="Search by student name, roll number, instructor, or franchise..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
        else if (key === "franchise") setFranchiseFilter(value as string);
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
      emptyMessage="No certificate requests found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} certificate requests`
      }
    />
  );
}
