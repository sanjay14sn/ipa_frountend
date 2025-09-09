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
  StudentData,
  StudentLevel,
  StudentIdStatus,
} from "@/services/student.service";
import StudentDetails from "./StudentDetails";

interface StudentsTableProps {
  students?: StudentData[];
  onStudentUpdate?: (updatedStudent: StudentData) => void;
  onStudentDelete?: (studentId: string) => void;
  onStudentEdit?: (student: StudentData) => void;
  onRequestIds?: () => void;
}

export default function StudentsTable({
  students,
  onStudentUpdate,
  onStudentDelete,
  onStudentEdit,
  onRequestIds,
}: StudentsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [idStatusFilter, setIdStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "dateJoined" | "level">(
    "dateJoined"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      const matchesLevel =
        levelFilter === "all" || student.level === levelFilter;
      const matchesStream =
        streamFilter === "all" || student.stream === streamFilter;

      const matchesIdStatus =
        idStatusFilter === "all" || student.idIssued === idStatusFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLevel &&
        matchesStream &&
        matchesIdStatus
      );
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
    idStatusFilter,
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

  const getLevelColor = (level: StudentLevel) => {
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

  const getIdStatusColor = (_idStatus: StudentIdStatus) => {
    return "bg-primary/10 text-primary border-primary/20";
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
  const uniqueLevels = [
    ...new Set(students?.map((student) => student.level).filter(Boolean)),
  ];
  const uniqueStreams = [
    ...new Set(students?.map((student) => student.stream).filter(Boolean)),
  ];

  // Count students by ID status
  const studentsWithoutIds =
    students?.filter((s) => s.idIssued === StudentIdStatus.NOT_ISSUED).length ||
    0;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search students, roll numbers, or parent names..."
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
            <Select value={idStatusFilter} onValueChange={setIdStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ID Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ID Status</SelectItem>
                <SelectItem value={StudentIdStatus.NOT_ISSUED}>
                  Not Issued
                </SelectItem>
                <SelectItem value={StudentIdStatus.REQUESTED}>
                  Requested
                </SelectItem>
                <SelectItem value={StudentIdStatus.ISSUED}>Issued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex gap-2">
          <Select
            value={sortBy}
            onValueChange={(value: "name" | "dateJoined" | "level") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateJoined">Date Joined</SelectItem>
              <SelectItem value="name">Name</SelectItem>
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
              <SelectItem value="desc">Newest First</SelectItem>
              <SelectItem value="asc">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedData.length} of {filteredData.length} students
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Student</TableHead>
              <TableHead className="text-center">Level & Standard</TableHead>
              <TableHead className="text-center">Parents</TableHead>
              <TableHead className="text-center">Contact</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">ID Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((student, index) => (
              <React.Fragment key={student.id}>
                <TableRow className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(student.id.toString())}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRow === student.id.toString() ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.rollNo} • Age{" "}
                          {calculateAge(student.dateOfBirth)} • {student.sex}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          {student.standard} • {student.stream}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <Badge
                        className={`${getLevelColor(student.level)} border`}
                      >
                        {student.level}
                      </Badge>
                      <div className="text-sm text-gray-600">
                        {student.standard}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>F:</strong> {student.fatherName}
                      </div>
                      <div>
                        <strong>M:</strong> {student.motherName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-center">
                        <Mail className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-[120px]">
                          {student.mail}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {student.fatherContactNo}
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
                    <Badge
                      className={`${getIdStatusColor(student.idIssued)} border`}
                    >
                      {student.idIssued}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStudentEdit?.(student)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStudentDelete?.(student.id.toString())}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === student.id.toString() && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <StudentDetails
                        student={student}
                        lastRow={index === paginatedData.length - 1}
                        expandedRows={expandedChildren}
                        onToggleRow={toggleRow}
                        onStudentUpdate={onStudentUpdate}
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
            No students found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
