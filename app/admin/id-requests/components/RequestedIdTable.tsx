"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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
import FranchiseIdDetails from "./FranchiseIdDetails";

interface FranchiseIdGroup {
  franchiseId: string;
  franchiseName: string;
  students: RequestedIdDetail[];
}

interface RequestedIdTableProps {
  onIssueId: (student: RequestedIdDetail) => void;
  refreshTrigger: number;
}

export default function RequestedIdTable({
  onIssueId,
  refreshTrigger,
}: RequestedIdTableProps) {
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [franchiseGroups, setFranchiseGroups] = useState<
    FranchiseIdGroup[]
  >([]);
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

        // Convert grouped data to array - use franchiseId for row keys (avoids hyphen/space issues)
        const groups: FranchiseIdGroup[] = Object.entries(result.data).map(
          ([franchiseName, students]) => {
            const studentList = students as RequestedIdDetail[];
            const franchiseId = studentList[0]?.franchise?.id ?? `fn-${franchiseName.replace(/\s+/g, "_")}`;
            return {
              franchiseId: String(franchiseId),
              franchiseName,
              students: studentList,
            };
          }
        );

        setFranchiseGroups(groups);
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

  const toggleRow = (id: string) => {
    if (id.includes("-") && !franchiseGroups.some((g) => g.franchiseId === id)) {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

  const getTotalStudentsCount = () => {
    return franchiseGroups.reduce(
      (acc, group) => acc + group.students.length,
      0
    );
  };

  // Table configuration
  const columns: AdminTableColumn<FranchiseIdGroup>[] = [
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
          {group.students.length} student
          {group.students.length !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      key: "franchiseAddress",
      header: "Franchise Address",
      className: "text-center",
      render: (group) => (
        <span className="text-sm text-gray-600">
          {group.students[0]?.franchise?.address ||
            group.students[0]?.franchiseeAddress ||
            "N/A"}
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
      data={franchiseGroups}
      loading={loading}
      columns={columns}
      getRowId={(group) => group.franchiseId}
      renderMainCell={(group) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">
            {group.franchiseName}
          </div>
          <div className="text-sm text-gray-500">
            {group.students[0]?.franchise?.address ||
              group.students[0]?.franchiseeAddress ||
              "N/A"}
          </div>
        </div>
      )}
      renderExpandedContent={(group) => (
        <FranchiseIdDetails
          franchiseId={group.franchiseId}
          franchiseName={group.franchiseName}
          students={group.students}
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
          onIssueId={onIssueId}
          statusFilter={statusFilter}
        />
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
        `Showing ${getTotalStudentsCount()} of ${total} ${statusFilter.toLowerCase()} IDs`
      }
    />
  );
}
