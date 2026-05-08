"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import { TrainingCourseInstructorData } from "@/services/course-instructor.service";
import TrainingCourseInstructorDetails from "./TrainingCourseInstructorDetails";

interface TrainingCourseInstructorsTableProps {
  courseInstructors?: TrainingCourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: TrainingCourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (
    courseInstructor: TrainingCourseInstructorData
  ) => void;
}

export default function TrainingCourseInstructorsTable({
  courseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
}: TrainingCourseInstructorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "amount">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Use the course instructors directly since they're already filtered by the API
  const trainingCourseInstructors = courseInstructors || [];

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!trainingCourseInstructors) {
      return [];
    }

    let filtered = trainingCourseInstructors.filter((courseInstructor) => {
      const matchesSearch =
        courseInstructor.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.instructorId
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (courseInstructor.trainingLevelName &&
          courseInstructor.trainingLevelName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (courseInstructor.additionalDetails &&
          courseInstructor.additionalDetails
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "amount":
          comparison = (a.amount ?? 0) - (b.amount ?? 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    trainingCourseInstructors,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Table configuration
  const columns: DataTableColumn<TrainingCourseInstructorData>[] = [
    {
      key: "courseInstructor",
      header: "Course Instructor",
      className: "w-[300px]",
    },
    {
      key: "trainingInfo",
      header: "Training Info",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="space-y-1">
          {courseInstructor.trainingLevelName && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20"
            >
              {courseInstructor.trainingLevelName}
            </Badge>
          )}
          <div className="text-sm text-muted-foreground">
            {courseInstructor.additionalDetails || "No details"}
          </div>
        </div>
      ),
    },
    {
      key: "paymentInfo",
      header: "Payment Info",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="text-sm space-y-1">
          <div>
            <strong>Total:</strong>{" "}
            {formatCurrency(courseInstructor.amount ?? 0)}
          </div>
          {courseInstructor.paidAmount && (
            <div className="text-green-600">
              <strong>Paid:</strong>{" "}
              {formatCurrency(courseInstructor.paidAmount)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-center",
      render: (courseInstructor) => (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
          {courseInstructor.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-center",
      render: (courseInstructor) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCourseInstructorEdit?.(courseInstructor)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onCourseInstructorDelete?.(courseInstructor.id.toString())
            }
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const sortOptions: DataTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "amount", label: "Amount" },
  ];

  return (
    <DataTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(courseInstructor) => courseInstructor.id.toString()}
      renderMainCell={(courseInstructor) => (
        <div className="flex flex-col">
          <div className="font-medium text-card-foreground">
            {courseInstructor.name}
          </div>
          <div className="text-sm text-muted-foreground">
            {courseInstructor.instructorId}
          </div>
          <div className="text-xs text-primary font-medium">
            ID: {courseInstructor.id}
          </div>
        </div>
      )}
      renderExpandedContent={(courseInstructor) => (
        <TrainingCourseInstructorDetails
          courseInstructor={courseInstructor}
          onCourseInstructorUpdate={onCourseInstructorUpdate}
        />
      )}
      searchPlaceholder="Search training course instructors, instructor IDs, or names..."
      onSearchChange={setSearchTerm}
      sortOptions={sortOptions}
      defaultSortBy="name"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "name" | "amount");
        setSortOrder(newSortOrder.toLowerCase() as "asc" | "desc");
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No training course instructors found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} training course instructors`
      }
    />
  );
}
