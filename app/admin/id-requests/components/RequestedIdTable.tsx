"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
import {
  RequestedIdDetail,
  getPaginatedRequestedIdDetails,
  getPaginatedIssuedIds,
} from "@/services/student.service";

interface RequestedIdTableProps {
  onIssueId: (student: RequestedIdDetail) => void;
  refreshTrigger: number;
}

export default function RequestedIdTable({
  onIssueId,
  refreshTrigger,
}: RequestedIdTableProps) {
  const [students, setStudents] = useState<RequestedIdDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Requested");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  // Fetch data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const result =
          statusFilter === "Requested"
            ? await getPaginatedRequestedIdDetails({
                page: currentPage,
                limit,
                search: searchTerm,
                sortBy,
                sortOrder,
              })
            : await getPaginatedIssuedIds({
                page: currentPage,
                limit,
                search: searchTerm,
                sortBy: sortBy === "createdAt" ? "idIssueDate" : sortBy,
                sortOrder,
              });
        setStudents(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching ID details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
    refreshTrigger,
  ]);

  // Table configuration
  const columns: AdminTableColumn<RequestedIdDetail>[] = [
    {
      key: "student",
      header: "Student",
      className: "w-[300px]",
    },
    {
      key: "rollNumber",
      header: "Roll Number",
      className: "text-center",
      render: (student) => (
        <Badge variant={statusFilter === "Issued" ? "default" : "outline"}>
          {student.rollNo}
        </Badge>
      ),
    },
    {
      key: "franchise",
      header: "Franchise",
      className: "text-center",
      render: (student) => (
        <span className="text-sm text-gray-600">
          {student.franchiseName || "N/A"}
        </span>
      ),
    },
    statusFilter === "Requested"
      ? {
          key: "actions",
          header: "Actions",
          className: "text-center",
          render: (student) => (
            <Button
              size="sm"
              variant="default"
              onClick={() => onIssueId(student)}
            >
              Issue ID
            </Button>
          ),
        }
      : {
          key: "issueDate",
          header: "Issue Date",
          className: "text-center",
          render: (student) => (
            <span className="text-sm text-gray-600">
              {student.idIssueDate
                ? new Date(student.idIssueDate).toLocaleDateString()
                : "N/A"}
            </span>
          ),
        },
  ];

  const filters: AdminTableFilter[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "Requested", label: "Requested" },
        { value: "Issued", label: "Issued" },
      ],
      defaultValue: "Requested",
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "createdAt", label: "Date" },
  ];

  return (
    <AdminTable
      data={students}
      loading={loading}
      columns={columns}
      getRowId={(student) => student.rollNo}
      renderMainCell={(student) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{student.name}</div>
          <div className="text-sm text-gray-500">
            DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
          </div>
        </div>
      )}
      renderExpandedContent={(student) => (
        <div className="bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">
                Residential Address:
              </span>
              <p className="text-gray-600">{student.residentialAddress}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Father Contact:</span>
              <p className="text-gray-600">{student.fatherContactNo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Mother Contact:</span>
              <p className="text-gray-600">{student.motherContactNo}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">
                Franchise Address:
              </span>
              <p className="text-gray-600">{student.franchiseeAddress}</p>
            </div>
          </div>
        </div>
      )}
      searchPlaceholder="Search students, roll numbers, or franchises..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "status") setStatusFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="createdAt"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage={`No ${statusFilter.toLowerCase()} IDs found matching your criteria`}
      resultsText={(count, total) =>
        `Showing ${count} of ${total} ${statusFilter.toLowerCase()} IDs`
      }
    />
  );
}
