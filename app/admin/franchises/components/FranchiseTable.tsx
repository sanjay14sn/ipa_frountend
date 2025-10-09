"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { FranchiseData, getPaginatedFranchises } from "@/services/franchisee.service";
import { FranchiseType, FranchiseStatus } from "@/services/franchise.enums";
import { getAllPrograms, Program } from "@/services/program.service";
import FranchiseDetails from "./FranchiseDetails";

interface FranchiseTableProps {
  onClientUpdate?: (updatedClient: FranchiseData) => void;
  refreshTrigger?: number;
}

export default function FranchiseTable({
  onClientUpdate,
  refreshTrigger,
}: FranchiseTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [programPopoverOpen, setProgramPopoverOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<string>("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<FranchiseData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programsData = await getAllPrograms();
        setPrograms(programsData);
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, selectedPrograms, sortBy, sortOrder]);

  // Fetch data from backend with pagination and filters
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getPaginatedFranchises("all", {
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          program: selectedPrograms.length > 0 ? selectedPrograms.join(",") : undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        });

        setClients(result.data);
        setTotalPages(result.meta.totalPages);
        setTotal(result.meta.total);
      } catch (error) {
        console.error("Error fetching franchises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, statusFilter, typeFilter, selectedPrograms, sortBy, sortOrder, refreshTrigger]);

  const toggleProgram = (programName: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(programName)
        ? prev.filter((p) => p !== programName)
        : [...prev, programName]
    );
  };

  const clearProgramFilter = () => {
    setSelectedPrograms([]);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
  };

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "inactive":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "suspended":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search franchises, franchisees, or cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value={FranchiseStatus.ACTIVE}>Active</SelectItem>
              <SelectItem value={FranchiseStatus.INACTIVE}>Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.values(FranchiseType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={programPopoverOpen} onOpenChange={setProgramPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[200px] justify-between text-left font-normal"
              >
                {selectedPrograms.length === 0 ? (
                  <span>All Programs</span>
                ) : (
                  <span className="truncate">
                    {selectedPrograms.length} selected
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Programs</span>
                  {selectedPrograms.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={clearProgramFilter}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[200px] overflow-y-auto p-2">
                {programs.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-center space-x-2 py-2 px-2 hover:bg-gray-100 rounded cursor-pointer"
                    onClick={() => toggleProgram(program.name)}
                  >
                    <Checkbox
                      checked={selectedPrograms.includes(program.name)}
                      onCheckedChange={() => toggleProgram(program.name)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {program.name}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="createdAt">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
              className="h-9 px-3"
            >
              {sortOrder === "ASC" ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">Asc</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-1" />
                  <span className="text-xs">Desc</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        {loading ? (
          <div className="h-5 w-48 bg-gray-200 animate-pulse rounded"></div>
        ) : (
          <>
            Showing {clients.length} of {total} franchises
            {(debouncedSearchTerm ||
              statusFilter !== "all" ||
              typeFilter !== "all" ||
              selectedPrograms.length > 0) && (
              <span className="text-gray-500"> (filtered)</span>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Franchise</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Programs</TableHead>
              <TableHead className="text-center">Created Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-48 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              clients.map((client, index) => (
              <React.Fragment key={client.id}>
                <TableRow className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(client.id.toString())}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRow === client.id.toString() ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">
                          {client.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.franchisee?.name || "Not specified"} •{" "}
                          {client.franchisee?.city || "Not specified"}
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          {client.franchisePayroll?.totalAmount
                            ? `₹${(
                                client.franchisePayroll.totalAmount / 1000
                              ).toFixed(0)}K/mo`
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{client.type}</TableCell>
                  <TableCell className="text-center">
                    {client.franchisePrograms?.map((fp) => fp.program.name).join(", ") || "N/A"}
                  </TableCell>
                  <TableCell className="text-center">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`${getStatusColor(client.status)} border`}
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === client.id.toString() && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <FranchiseDetails
                        client={client}
                        lastRow={false}
                        expandedRows={expandedChildren}
                        onToggleRow={toggleRow}
                        onClientUpdate={onClientUpdate}
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
      {!loading && totalPages > 1 && (
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

      {!loading && clients.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No franchises found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
