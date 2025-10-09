"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, ChevronFirst, ChevronLast, Search, ArrowUp, ArrowDown } from "lucide-react";
import {
  AdminCourseInstructorData,
  getPaginatedCourseInstructors,
} from "@/services/course-instructor.service";
import CourseInstructorDetails from "./CourseInstructorDetails";

interface PendingCourseInstructorsTableProps {
  onApprove: (instructor: AdminCourseInstructorData) => void;
  onReject: (instructor: AdminCourseInstructorData) => void;
  refreshTrigger: number;
}

export default function PendingCourseInstructorsTable({
  onApprove,
  onReject,
  refreshTrigger,
}: PendingCourseInstructorsTableProps) {
  const [instructors, setInstructors] = useState<AdminCourseInstructorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("DESC");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortBy, sortOrder]);

  // Fetch data
  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        setLoading(true);
        const result = await getPaginatedCourseInstructors(statusFilter, {
          page: currentPage,
          limit,
          search: debouncedSearch,
          sortBy,
          sortOrder,
        });
        setInstructors(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching course instructors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructors();
  }, [currentPage, debouncedSearch, statusFilter, sortBy, sortOrder, refreshTrigger]);

  const toggleRow = (id: string) => {
    const newExpandedChildren = new Set(expandedChildren);
    if (newExpandedChildren.has(id)) {
      newExpandedChildren.delete(id);
    } else {
      newExpandedChildren.add(id);
    }
    setExpandedChildren(newExpandedChildren);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search instructors, instructor IDs, or franchises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Date</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={toggleSortOrder} variant="outline" className="w-[140px]">
          {sortOrder === "ASC" ? (
            <>
              <ArrowUp className="w-4 h-4 mr-2" />
              Asc
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4 mr-2" />
              Desc
            </>
          )}
        </Button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {loading ? "Loading..." : `Showing ${instructors.length} of ${total} course instructors`}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Instructor</TableHead>
              <TableHead className="text-center">Franchise</TableHead>
              <TableHead className="text-center">Instructor ID</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              instructors.map((instructor) => (
                <React.Fragment key={instructor.id}>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRow(instructor.id.toString())}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedChildren.has(instructor.id.toString()) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex flex-col">
                          <div className="font-medium text-gray-900">
                            {instructor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {instructor.mail}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {instructor.franchiseName || "N/A"}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600">
                      {instructor.instructorId}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          instructor.status === "Pending"
                            ? "outline"
                            : instructor.status === "Approved"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {instructor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {instructor.status === "Pending" && (
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onApprove(instructor)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onReject(instructor)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedChildren.has(instructor.id.toString()) && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <CourseInstructorDetails
                          instructors={[instructor]}
                          lastRow={false}
                          expandedRows={new Set([instructor.id.toString()])}
                          onToggleRow={toggleRow}
                          onApprove={onApprove}
                          onReject={onReject}
                          showActions={false}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
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

      {!loading && instructors.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No course instructors found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
