"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Calendar,
  CreditCard,
} from "lucide-react";
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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
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
    } else {
      if (expandedRow === id) {
        setExpandedRow(null);
        setExpandedChildren(new Set());
      } else {
        setExpandedRow(id);
        setExpandedChildren(new Set());
      }
    }
  };

  const getAmountColor = (amount: number) => {
    return "bg-green-100 text-green-800 border-green-200";
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

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search training course instructors, instructor IDs, or names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={trainingTypeFilter}
              onValueChange={setTrainingTypeFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Training Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTrainingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex gap-2">
          <Select
            value={sortBy}
            onValueChange={(value: "name" | "amount" | "installmentCount") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="installmentCount">Installments</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortOrder}
            onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedData.length} of {filteredData.length} training course
        instructors
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Course Instructor</TableHead>
              <TableHead className="text-center">Training Info</TableHead>
              <TableHead className="text-center">Payment Info</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((courseInstructor, index) => (
              <React.Fragment key={courseInstructor.id}>
                <TableRow className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleRow(courseInstructor.id.toString())
                        }
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRow === courseInstructor.id.toString() ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
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
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
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
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Total:</strong>{" "}
                        {formatCurrency(courseInstructor.amount)}
                      </div>
                      <div>
                        <strong>Installments:</strong>{" "}
                        {courseInstructor.installmentCount} ×{" "}
                        {formatCurrency(courseInstructor.installmentAmount)}
                      </div>
                      {courseInstructor.paidAmount && (
                        <div className="text-green-600">
                          <strong>Paid:</strong>{" "}
                          {formatCurrency(courseInstructor.paidAmount)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 border">
                      {courseInstructor.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onCourseInstructorEdit?.(courseInstructor)
                        }
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onCourseInstructorDelete?.(
                            courseInstructor.id.toString()
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === courseInstructor.id.toString() && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <TrainingCourseInstructorDetails
                        courseInstructor={courseInstructor}
                        lastRow={index === paginatedData.length - 1}
                        expandedRows={expandedChildren}
                        onToggleRow={toggleRow}
                        onCourseInstructorUpdate={onCourseInstructorUpdate}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum =
                Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {paginatedData.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No training course instructors found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
