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
  RequestedIdDetail,
  getPaginatedIssuedIds,
} from "@/services/student.service";

interface IssuedIdTableProps {
  refreshTrigger: number;
}

export default function IssuedIdTable({ refreshTrigger }: IssuedIdTableProps) {
  const [students, setStudents] = useState<RequestedIdDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("idIssueDate");
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
  }, [debouncedSearch, sortBy, sortOrder]);

  // Fetch data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const result = await getPaginatedIssuedIds({
          page: currentPage,
          limit,
          search: debouncedSearch,
          sortBy,
          sortOrder,
        });
        setStudents(result.data);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } catch (error) {
        console.error("Error fetching issued IDs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentPage, debouncedSearch, sortBy, sortOrder, refreshTrigger]);

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
            placeholder="Search students, roll numbers, or franchises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="idIssueDate">Issue Date</SelectItem>
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
        {loading ? "Loading..." : `Showing ${students.length} of ${total} issued IDs`}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Student</TableHead>
              <TableHead className="text-center">Roll Number</TableHead>
              <TableHead className="text-center">Franchise</TableHead>
              <TableHead className="text-center">Issue Date</TableHead>
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
                </TableRow>
              ))
            ) : (
              students.map((student) => (
                <React.Fragment key={student.rollNo}>
                  <TableRow className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRow(student.rollNo)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedChildren.has(student.rollNo) ? (
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
                            DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{student.rollNo}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600">
                      {student.franchiseName || "N/A"}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-600">
                      {student.idIssueDate
                        ? new Date(student.idIssueDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {expandedChildren.has(student.rollNo) && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-gray-50 p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Residential Address:</span>
                            <p className="text-gray-600">{student.residentialAddress}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Father Contact:</span>
                            <p className="text-gray-600">{student.fatherContactNo}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Mother Contact:</span>
                            <p className="text-gray-600">{student.motherContactNo}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Franchise Address:</span>
                            <p className="text-gray-600">{student.franchiseeAddress}</p>
                          </div>
                        </div>
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

      {!loading && students.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No issued IDs found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
