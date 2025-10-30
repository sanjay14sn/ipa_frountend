"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { AdminTable } from "@/components/shared";
import type {
  AdminTableColumn,
  AdminTableFilter,
  AdminTableSortOption,
} from "@/components/shared/AdminTable";
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
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [trainingTypeFilter, setTrainingTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "amount" | "installmentCount">(
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
        courseInstructor.trainingType
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (courseInstructor.additionalDetails &&
          courseInstructor.additionalDetails
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesTrainingType =
        trainingTypeFilter === "all" ||
        courseInstructor.trainingType === trainingTypeFilter;

      return matchesSearch && matchesTrainingType;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "installmentCount":
          comparison = a.installmentCount - b.installmentCount;
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
    trainingTypeFilter,
    sortBy,
    sortOrder,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const toggleRow = (id: string) => {
    if (id.includes("-")) {
      const newExpandedChildren = new Set(expandedChildren);
      if (newExpandedChildren.has(id)) {
        newExpandedChildren.delete(id);
      } else {
        newExpandedChildren.add(id);
      }
      setExpandedChildren(newExpandedChildren);
    }
  };

  const getTrainingTypeColor = (trainingType: string) => {
    switch (trainingType) {
      case "Elementary":
        return "bg-green-100 text-green-800 border-green-200";
      case "Regular":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Grand":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get unique values for filters
  const uniqueTrainingTypes = [
    ...new Set(
      trainingCourseInstructors?.map((ci) => ci.trainingType).filter(Boolean)
    ),
  ];

  // Table configuration
  const columns: AdminTableColumn<TrainingCourseInstructorData>[] = [
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
          <Badge
            className={`${getTrainingTypeColor(
              courseInstructor.trainingType || "Unknown"
            )} border`}
          >
            {courseInstructor.trainingType || "Unknown"}
          </Badge>
          <div className="text-sm text-gray-600">
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
            <strong>Total:</strong> {formatCurrency(courseInstructor.amount)}
          </div>
          <div>
            <strong>Installments:</strong> {courseInstructor.installmentCount} ×{" "}
            {formatCurrency(courseInstructor.installmentAmount)}
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
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 border">
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

  const filters: AdminTableFilter[] = [
    {
      key: "trainingType",
      label: "Training Type",
      options: [
        { value: "all", label: "All Types" },
        ...uniqueTrainingTypes.map((type) => ({ value: type, label: type })),
      ],
      defaultValue: "all",
    },
  ];

  const sortOptions: AdminTableSortOption[] = [
    { value: "name", label: "Name" },
    { value: "amount", label: "Amount" },
    { value: "installmentCount", label: "Installments" },
  ];

  return (
    <AdminTable
      data={paginatedData}
      loading={false}
      columns={columns}
      getRowId={(courseInstructor) => courseInstructor.id.toString()}
      renderMainCell={(courseInstructor) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">
            {courseInstructor.name}
          </div>
          <div className="text-sm text-gray-500">
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
          lastRow={false}
          expandedRows={expandedChildren}
          onToggleRow={toggleRow}
          onCourseInstructorUpdate={onCourseInstructorUpdate}
        />
      )}
      searchPlaceholder="Search training course instructors, instructor IDs, or names..."
      onSearchChange={setSearchTerm}
      filters={filters}
      onFilterChange={(key, value) => {
        if (key === "trainingType") setTrainingTypeFilter(value as string);
      }}
      sortOptions={sortOptions}
      defaultSortBy="name"
      defaultSortOrder="DESC"
      onSortChange={(newSortBy, newSortOrder) => {
        setSortBy(newSortBy as "name" | "amount" | "installmentCount");
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
