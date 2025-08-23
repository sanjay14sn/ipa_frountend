"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Calendar,
  Users,
} from "lucide-react";
import {
  StudentData,
  StudentLevel,
  StudentStream,
  StudentIdStatus,
} from "@/services/student.service";
import StudentDetails from "./StudentDetails";

interface StudentsTableProps {
  students?: StudentData[];
  onEdit?: (student: StudentData) => void;
  onDelete?: (student: StudentData) => void;
  onActivate?: (student: StudentData) => void;
  onDeactivate?: (student: StudentData) => void;
  onIssueId?: (student: StudentData) => void;
}

export default function StudentsTable({
  students = [],
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  onIssueId,
}: StudentsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [streamFilter, setStreamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [idStatusFilter, setIdStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter data
  const filteredData = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.fatherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.mail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel =
        levelFilter === "all" || student.level === levelFilter;
      const matchesStream =
        streamFilter === "all" || student.stream === streamFilter;
      const matchesStatus =
        statusFilter === "all" ||
        student.isActive === (statusFilter === "active");
      const matchesIdStatus =
        idStatusFilter === "all" || student.idIssued === idStatusFilter;

      return (
        matchesSearch &&
        matchesLevel &&
        matchesStream &&
        matchesStatus &&
        matchesIdStatus
      );
    });
  }, [
    students,
    searchTerm,
    levelFilter,
    streamFilter,
    statusFilter,
    idStatusFilter,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const toggleRow = (id: string) => {
    if (expandedRow === id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(id);
    }
  };

  const getLevelColor = (level: StudentLevel) => {
    if (level.startsWith("EL"))
      return "bg-green-100 text-green-800 border-green-200";
    if (level.startsWith("RL"))
      return "bg-blue-100 text-blue-800 border-blue-200";
    if (level.startsWith("GML"))
      return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getIdStatusColor = (status: StudentIdStatus) => {
    switch (status) {
      case StudentIdStatus.ISSUED:
        return "bg-green-100 text-green-800 border-green-200";
      case StudentIdStatus.REQUESTED:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case StudentIdStatus.NOT_ISSUED:
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Get unique values for filters
  const uniqueLevels = [...new Set(students.map((s) => s.level))];
  const uniqueStreams = [...new Set(students.map((s) => s.stream))];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
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
          <Select value={idStatusFilter} onValueChange={setIdStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="ID Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ID Status</SelectItem>
              <SelectItem value={StudentIdStatus.ISSUED}>Issued</SelectItem>
              <SelectItem value={StudentIdStatus.REQUESTED}>
                Requested
              </SelectItem>
              <SelectItem value={StudentIdStatus.NOT_ISSUED}>
                Not Issued
              </SelectItem>
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
              <TableHead className="text-center">Level & Stream</TableHead>
              <TableHead className="text-center">Parents</TableHead>
              <TableHead className="text-center">Contact</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((student) => (
              <>
                <TableRow key={student.id} className="hover:bg-gray-50">
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
                          Roll No: {student.rollNo} • {student.standard}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          ID: {student.id}
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
                        {student.stream}
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
                        <span className="truncate max-w-[150px]">
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
                    <div className="space-y-1">
                      <Badge
                        className={`${getStatusColor(student.isActive)} border`}
                      >
                        {student.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        className={`${getIdStatusColor(
                          student.idIssued
                        )} border text-xs`}
                      >
                        ID: {student.idIssued}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {student.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeactivate?.(student)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onActivate?.(student)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {student.idIssued === StudentIdStatus.NOT_ISSUED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onIssueId?.(student)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <User className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(student)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete?.(student)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === student.id.toString() && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <StudentDetails student={student} />
                    </TableCell>
                  </TableRow>
                )}
              </>
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
              <ChevronFirst className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
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
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronLast className="w-4 h-4" />
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
