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
import {
  CourseInstructorData,
  BloodGroup,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface CourseInstructorsTableProps {
  courseInstructors?: CourseInstructorData[];
  onCourseInstructorUpdate?: (
    updatedCourseInstructor: CourseInstructorData
  ) => void;
  onCourseInstructorDelete?: (courseInstructorId: string) => void;
  onCourseInstructorEdit?: (courseInstructor: CourseInstructorData) => void;
}

export default function CourseInstructorsTable({
  courseInstructors,
  onCourseInstructorUpdate,
  onCourseInstructorDelete,
  onCourseInstructorEdit,
}: CourseInstructorsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "city">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!courseInstructors) {
      return [];
    }

    // Filter out course instructors with training status
    let filtered = courseInstructors.filter((courseInstructor) => {
      // Exclude course instructors with training status
      if (courseInstructor.status === "Training") {
        return false;
      }
      const matchesSearch =
        courseInstructor.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.instructorId
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.phone
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.mail
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        courseInstructor.education
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && courseInstructor.status === "Active") ||
        (statusFilter === "inactive" && courseInstructor.status !== "Active");

      const matchesBloodGroup =
        bloodGroupFilter === "all" ||
        courseInstructor.bloodGroup === bloodGroupFilter;
      const matchesCity =
        cityFilter === "all" || courseInstructor.city === cityFilter;

      return matchesSearch && matchesStatus && matchesBloodGroup && matchesCity;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "dateJoined":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "city":
          comparison = a.city.localeCompare(b.city);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    courseInstructors,
    searchTerm,
    statusFilter,
    bloodGroupFilter,
    cityFilter,
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

  const getBloodGroupColor = (bloodGroup: BloodGroup) => {
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-gray-50 text-gray-600 border-gray-200";
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: Date): number => {
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
  const uniqueBloodGroups = [
    ...new Set(courseInstructors?.map((ci) => ci.bloodGroup).filter(Boolean)),
  ];
  const uniqueCities = [
    ...new Set(courseInstructors?.map((ci) => ci.city).filter(Boolean)),
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search course instructors, instructor IDs, or contact info..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={bloodGroupFilter}
              onValueChange={setBloodGroupFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blood Groups</SelectItem>
                {uniqueBloodGroups.map((bloodGroup) => (
                  <SelectItem key={bloodGroup} value={bloodGroup}>
                    {bloodGroup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
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
            onValueChange={(value: "name" | "dateJoined" | "city") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateJoined">Date Joined</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="city">City</SelectItem>
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
        Showing {paginatedData.length} of {filteredData.length} course
        instructors
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Course Instructor</TableHead>
              <TableHead className="text-center">Personal Info</TableHead>
              <TableHead className="text-center">Contact</TableHead>
              <TableHead className="text-center">Education & Work</TableHead>
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
                          {courseInstructor.instructorId} • Age{" "}
                          {calculateAge(courseInstructor.dob)} •{" "}
                          {courseInstructor.bloodGroup}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          {courseInstructor.city} • {courseInstructor.education}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <Badge
                        className={`${getBloodGroupColor(
                          courseInstructor.bloodGroup
                        )} border`}
                      >
                        {courseInstructor.bloodGroup}
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {courseInstructor.city}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-center">
                        <Mail className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[120px]">
                          {courseInstructor.mail}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {courseInstructor.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Education:</strong> {courseInstructor.education}
                      </div>
                      <div>
                        <strong>Occupation:</strong>{" "}
                        {courseInstructor.occupation}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`${getStatusColor(
                        courseInstructor.status
                      )} border`}
                    >
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
                    <TableCell colSpan={6} className="p-0">
                      <CourseInstructorDetails
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
            No course instructors found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
