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
  Search,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  BookOpen,
  Calendar,
  Award,
} from "lucide-react";
import { EligibleStudent } from "@/services/student.service";

interface EligibleStudentsTableProps {
  students?: EligibleStudent[];
  onRequestCertificate?: (student: EligibleStudent) => void;
}

export default function EligibleStudentsTable({
  students,
  onRequestCertificate,
}: EligibleStudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "rollNo" | "level">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!students) {
      return [];
    }

    let filtered = students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      const matchesLevel =
        levelFilter === "all" || student.level === levelFilter;
      const matchesStream =
        streamFilter === "all" || student.stream === streamFilter;

      return matchesSearch && matchesStatus && matchesLevel && matchesStream;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rollNo":
          comparison = a.rollNo.localeCompare(b.rollNo);
          break;
        case "level":
          comparison = a.level.localeCompare(b.level);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    students,
    searchTerm,
    statusFilter,
    levelFilter,
    streamFilter,
    sortBy,
    sortOrder,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-gray-50 text-gray-600 border-gray-200";
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
  const uniqueLevels = [
    ...new Set(students?.map((student) => student.level).filter(Boolean)),
  ];
  const uniqueStreams = [
    ...new Set(students?.map((student) => student.stream).filter(Boolean)),
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search eligible students by name or roll number..."
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
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {uniqueLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={streamFilter} onValueChange={setStreamFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streams</SelectItem>
                {uniqueStreams.map((stream) => (
                  <SelectItem key={stream} value={stream}>
                    {stream}
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
            onValueChange={(value: "name" | "rollNo" | "level") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rollNo">Roll Number</SelectItem>
              <SelectItem value="level">Level</SelectItem>
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
              <SelectItem value="asc">A-Z</SelectItem>
              <SelectItem value="desc">Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedData.length} of {filteredData.length} eligible
        students
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Student</TableHead>
              <TableHead className="text-center">Level & Standard</TableHead>
              <TableHead className="text-center">Details</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((student) => (
              <TableRow key={student.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-900">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {student.rollNo} • Age {calculateAge(student.dateOfBirth)}{" "}
                      • {student.sex}
                    </div>
                    <div className="text-xs text-primary font-medium">
                      {student.standard} • {student.stream}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="space-y-1">
                    <Badge className={`${getLevelColor(student.level)} border`}>
                      {student.level}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {student.standard}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {student.stream}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={`${getStatusColor(student.isActive)} border`}
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    size="sm"
                    onClick={() => onRequestCertificate?.(student)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Award className="w-4 h-4 mr-1" />
                    Request Certificate
                  </Button>
                </TableCell>
              </TableRow>
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
            No eligible students found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
