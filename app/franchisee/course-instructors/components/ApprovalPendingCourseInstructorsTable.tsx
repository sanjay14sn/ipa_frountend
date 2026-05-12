"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, MapPin } from "lucide-react";
import { DataTable } from "@/components/shared";
import type { DataTableColumn, DataTableSortOption } from "@/components/shared";
import { CourseInstructorData } from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface ApprovalPendingCourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
}

export default function ApprovalPendingCourseInstructorsTable({
  courseInstructors,
}: ApprovalPendingCourseInstructorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("dateJoined");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!courseInstructors) return [];

    const lower = searchTerm.toLowerCase();
    let filtered = courseInstructors.filter(
      (ci) =>
        ci.name.toLowerCase().includes(lower) ||
        ci.instructorId.toLowerCase().includes(lower) ||
        ci.phone.toLowerCase().includes(lower) ||
        ci.mail.toLowerCase().includes(lower)
    );

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "city") cmp = a.city.localeCompare(b.city);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "ASC" ? cmp : -cmp;
    });

    return filtered;
  }, [courseInstructors, searchTerm, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const columns: DataTableColumn<CourseInstructorData>[] = [
    {
      key: "contact",
      header: "Contact",
      className: "w-[170px]",
      render: (ci) => (
        <div className="flex items-center gap-1 text-sm text-card-foreground">
          <Phone className="w-3 h-3 text-muted-foreground" />
          {ci.phone || "N/A"}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "w-[170px]",
      render: (ci) => (
        <div className="flex items-center gap-1 text-sm text-card-foreground">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          {ci.city || "N/A"}
        </div>
      ),
    },
    {
      key: "submitted",
      header: "Submitted On",
      className: "w-[150px]",
      render: (ci) => (
        <span className="text-sm text-muted-foreground">
          {new Date(ci.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[160px]",
      render: () => (
        <Badge className="bg-amber-50 text-amber-700 border border-amber-200 gap-1">
          <Clock className="w-3 h-3" />
          Pending Approval
        </Badge>
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { label: "Date Submitted", value: "dateJoined" },
    { label: "Name", value: "name" },
    { label: "City", value: "city" },
  ];

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      getRowId={(ci) => String(ci.id)}
      renderMainCell={(ci) => (
        <div>
          <div className="font-medium text-card-foreground">{ci.name}</div>
          <div className="text-xs text-muted-foreground">{ci.instructorId}</div>
        </div>
      )}
      renderExpandedContent={(ci) => <CourseInstructorDetails courseInstructor={ci} />}
      searchPlaceholder="Search by name, ID, phone or email..."
      onSearchChange={(val) => {
        setSearchTerm(val);
        setCurrentPage(1);
      }}
      sortOptions={sortOptions}
      defaultSortBy="dateJoined"
      defaultSortOrder="DESC"
      onSortChange={(by, order) => {
        setSortBy(by);
        setSortOrder(order);
        setCurrentPage(1);
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No course instructors pending approval."
    />
  );
}
