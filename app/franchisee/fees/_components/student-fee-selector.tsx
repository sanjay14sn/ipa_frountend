"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  Search,
  ArrowLeft,
  Settings,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { StudentData } from "@/services/student-list.service";

interface StudentFeeSelectorProps {
  students: StudentData[];
  selectedStudent: StudentData | null;
  onSelectStudent: (student: StudentData | null) => void;
  isLoading?: boolean;
}

export function StudentFeeSelector({
  students,
  selectedStudent,
  onSelectStudent,
  isLoading = false,
}: StudentFeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getLevelName = (student: StudentData) => {
    if (typeof student.level === "object" && student.level !== null) {
      return student.level.name || student.level.code || "Level N/A";
    }
    return String(student.level || "N/A");
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter((s) => {
      const name = s.name.toLowerCase();
      const roll = s.rollNo.toLowerCase();
      const level = getLevelName(s).toLowerCase();
      const phone = (s.fatherContactNo || s.motherContactNo || "").toLowerCase();
      const email = (s.mail || "").toLowerCase();
      return (
        name.includes(term) ||
        roll.includes(term) ||
        level.includes(term) ||
        phone.includes(term) ||
        email.includes(term)
      );
    });
  }, [students, searchTerm]);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Page 2 View: Student Selected
  if (selectedStudent) {
    return (
      <div className="space-y-4">
        {/* Navigation back button */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectStudent(null)}
            className="gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Enrolled Students List
          </Button>

          <span className="text-xs text-muted-foreground font-medium">
            Configuring Fee Structure
          </span>
        </div>

        {/* Selected Student Banner Card */}
        <Card className="border-primary/30 bg-primary/5 shadow-xs overflow-hidden">
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-lg shadow-sm">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-foreground text-base">
                      {selectedStudent.name}
                    </h4>
                    <Badge variant="outline" className="bg-background text-xs font-mono">
                      #{selectedStudent.rollNo}
                    </Badge>
                    <Badge
                      variant={selectedStudent.status === "active" ? "default" : "secondary"}
                      className="capitalize text-xs font-medium"
                    >
                      {selectedStudent.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      Level: {getLevelName(selectedStudent)}
                    </span>
                    {selectedStudent.standard && (
                      <span>Std: <strong className="text-foreground">{selectedStudent.standard}</strong></span>
                    )}
                    {(selectedStudent.fatherContactNo || selectedStudent.motherContactNo) && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedStudent.fatherContactNo || selectedStudent.motherContactNo}
                      </span>
                    )}
                    {selectedStudent.mail && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedStudent.mail}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectStudent(null)}
                className="self-start text-xs font-semibold hover:bg-background sm:self-center"
              >
                Change Student
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getNextDueDate = (student: StudentData) => {
    const configured = student.feeConfiguration;
    if (configured?.configured && configured.nextDueDate) {
      const parsed = new Date(configured.nextDueDate);
      if (!Number.isNaN(parsed.getTime())) {
        const day = String(parsed.getDate()).padStart(2, "0");
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }

    const baseDate = student.dateOfJoining
      ? new Date(student.dateOfJoining)
      : student.createdAt
      ? new Date(student.createdAt)
      : null;

    if (!baseDate || isNaN(baseDate.getTime())) return "Pending Setup";

    const nextDue = new Date(baseDate);
    nextDue.setDate(nextDue.getDate() + 30);

    const day = String(nextDue.getDate()).padStart(2, "0");
    const month = String(nextDue.getMonth() + 1).padStart(2, "0");
    const year = nextDue.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getAcademicDetails = (student: StudentData) => {
    let streamName = student.stream ? String(student.stream) : "Elementary";
    let levelName = "Level 1";
    let levelCode = "EL1";

    if (typeof student.level === "object" && student.level !== null) {
      const lvlObj = student.level as any;
      levelName = lvlObj.name || lvlObj.code || "Level 1";
      levelCode = lvlObj.code || lvlObj.name || "EL1";
      if (lvlObj.stream && typeof lvlObj.stream === "object" && lvlObj.stream.name) {
        streamName = lvlObj.stream.name;
      }
    } else if (typeof student.level === "string") {
      levelName = student.level;
      levelCode = student.level;
    }

    return {
      stream: streamName,
      levelName,
      levelCode,
    };
  };

  // Page 1 View: Enrolled Students List View with Pagination
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Header & Search Controls */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Select Enrolled Student
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a registered student from the list to configure fee structures and course timelines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, roll #, phone, level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>
          </div>
        </div>

        {/* List View Table */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading enrolled students list...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
            <User className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No Students Found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm
                ? `No students matching "${searchTerm}". Try searching with another keyword.`
                : "No active enrolled students registered under your franchise."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px]">Student</TableHead>
                  <TableHead className="w-[150px]">Roll Number</TableHead>
                  <TableHead className="w-[160px]">Academic Details</TableHead>
                  <TableHead className="w-[140px]">Next Due</TableHead>
                  <TableHead className="w-[180px]">Contact Info</TableHead>
                  <TableHead className="w-[90px] text-center">Status</TableHead>
                  <TableHead className="w-[130px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onSelectStudent(student)}
                  >
                    {/* Student Avatar & Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                            {student.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Roll Number */}
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs bg-background">
                        #{student.rollNo}
                      </Badge>
                    </TableCell>

                    {/* Academic Details (Stream, Level Name, Level Code) */}
                    <TableCell>
                      {(() => {
                        const details = getAcademicDetails(student);
                        return (
                          <div className="space-y-0.5 text-xs">
                            <div className="font-semibold text-foreground text-xs">
                              {details.stream}
                            </div>
                            <div className="font-medium text-muted-foreground text-xs flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                              {details.levelName}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {details.levelCode}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Next Due */}
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                        {getNextDueDate(student)}
                      </Badge>
                    </TableCell>

                    {/* Contact Info */}
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {(student.fatherContactNo || student.motherContactNo) && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{student.fatherContactNo || student.motherContactNo}</span>
                          </div>
                        )}
                        {student.mail && (
                          <div className="flex items-center gap-1 truncate max-w-[180px]">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{student.mail}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge
                        variant={student.status === "active" ? "default" : "secondary"}
                        className="capitalize text-[11px] py-0.5 px-2"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>

                    {/* Action Button */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student);
                        }}
                        className="gap-1.5 font-semibold text-xs h-8 px-3"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Configure Fee
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 text-xs text-muted-foreground border-t border-border/40">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue placeholder={String(pageSize)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
              <span className="ml-2 font-medium text-foreground">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredStudents.length)} -{" "}
                {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-2 font-semibold text-xs text-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


