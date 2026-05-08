"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableFilter,
} from "@/components/shared";
import {
  AdminCertificateRequest,
  AdminCertificateRequestsByFranchise,
} from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";
import {
  approveCertificateRequestWithRevalidation,
  rejectCertificateRequestWithRevalidation,
} from "@/hooks/api/student.hooks";
import FranchiseCertificateDetails from "./FranchiseCertificateDetails";

interface FranchiseCertGroup {
  franchiseId: string;
  franchiseName: string;
  requests: AdminCertificateRequest[];
}

interface AdminCertificateRequestsTableProps {
  certificateRequestsByFranchise?: AdminCertificateRequestsByFranchise;
  onRefresh?: () => void;
  scopedFranchiseId?: string;
}

export default function AdminCertificateRequestsTable({
  certificateRequestsByFranchise,
  onRefresh,
  scopedFranchiseId,
}: AdminCertificateRequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  const allGroups = useMemo((): FranchiseCertGroup[] => {
    if (!certificateRequestsByFranchise) return [];
    return Object.entries(certificateRequestsByFranchise).map(
      ([franchiseName, requests]) => ({
        franchiseId: String(requests[0]?.franchiseId ?? franchiseName),
        franchiseName,
        requests,
      })
    );
  }, [certificateRequestsByFranchise]);

  const filteredGroups = useMemo((): FranchiseCertGroup[] => {
    const scoped = scopedFranchiseId?.trim();
    return allGroups
      .map((group) => ({
        ...group,
        requests: group.requests.filter((r) => r.status === statusFilter),
      }))
      .filter((group) => {
        if (group.requests.length === 0) return false;
        if (scoped && group.franchiseId !== scoped) return false;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            group.franchiseName.toLowerCase().includes(term) ||
            group.requests.some(
              (r) =>
                r.studentName.toLowerCase().includes(term) ||
                r.studentRollNo.toLowerCase().includes(term) ||
                r.instructorName.toLowerCase().includes(term)
            )
          );
        }
        return true;
      });
  }, [allGroups, statusFilter, scopedFranchiseId, searchTerm]);

  const totalRequests = useMemo(
    () => filteredGroups.reduce((a, g) => a + g.requests.length, 0),
    [filteredGroups]
  );

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGroups.slice(start, start + itemsPerPage);
  }, [filteredGroups, currentPage]);

  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  const handleApprove = async (requestId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request approved successfully",
      });
      onRefresh?.();
    } catch {
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
    } catch {
      toast({
        title: "Error",
        description: "Failed to reject certificate request",
        variant: "destructive",
      });
    }
  };

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

  const columns: DataTableColumn<FranchiseCertGroup>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[300px]",
    },
    {
      key: "students",
      header: "Students",
      className: "text-center",
      render: (group) => (
        <Badge variant="secondary">
          {group.requests.length} student
          {group.requests.length !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: () => (
        <Badge className={`${getStatusColor(statusFilter)} border`}>
          {statusFilter}
        </Badge>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Issued", label: "Issued" },
        { value: "Rejected", label: "Rejected" },
      ],
      defaultValue: "Pending",
    },
  ];

  return (
    <DataTable
      data={paginatedGroups}
      loading={false}
      columns={columns}
      getRowId={(group) => group.franchiseId}
      renderMainCell={(group) => (
        <div className="font-medium text-gray-900">{group.franchiseName}</div>
      )}
      renderExpandedContent={(group) => (
        <FranchiseCertificateDetails
          franchiseName={group.franchiseName}
          requests={group.requests}
          statusFilter={statusFilter}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      searchPlaceholder="Search by student name, roll number, instructor, or franchise..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
      }}
      pagination={{ total: filteredGroups.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No certificate requests found matching your criteria"
      resultsText={(_, total) =>
        `Showing ${totalRequests} ${statusFilter.toLowerCase()} certificate request${totalRequests !== 1 ? "s" : ""} across ${total} franchise${total !== 1 ? "s" : ""}`
      }
    />
  );
}
