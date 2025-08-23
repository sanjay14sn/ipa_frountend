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
} from "lucide-react";
import { FranchiseData } from "@/services/franchisee.service";
import PendingFranchiseDetails from "./PendingFranchiseDetails";

interface PendingApprovalsTableProps {
  applications?: FranchiseData[];
  onApprove?: (application: FranchiseData) => void;
  onReject?: (application: FranchiseData) => void;
}

export default function PendingApprovalsTable({
  applications = [],
  onApprove,
  onReject,
}: PendingApprovalsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter data
  const filteredData = useMemo(() => {
    return applications.filter((application) => {
      const matchesSearch =
        application.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        application.franchisee?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        application.franchisee?.city
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;
      const matchesType =
        typeFilter === "all" || application.type === typeFilter;
      const matchesProgram =
        programFilter === "all" || application.programName === programFilter;

      return matchesSearch && matchesStatus && matchesType && matchesProgram;
    });
  }, [applications, searchTerm, statusFilter, typeFilter, programFilter]);

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Get unique values for filters
  const uniqueStatuses = [
    ...new Set(applications.map((app) => app.status).filter(Boolean)),
  ];
  const uniqueTypes = [
    ...new Set(applications.map((app) => app.type).filter(Boolean)),
  ];
  const uniquePrograms = [
    ...new Set(applications.map((app) => app.programName).filter(Boolean)),
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search applications, franchisees, or cities..."
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
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {uniquePrograms.map((program) => (
                <SelectItem key={program} value={program}>
                  {program}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedData.length} of {filteredData.length} applications
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Application</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Program</TableHead>
              <TableHead className="text-center">Application Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((application, index) => (
              <>
                <TableRow key={application.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(application.id.toString())}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRow === application.id.toString() ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">
                          {application.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {application.franchisee?.name || "Not specified"} •{" "}
                          {application.franchisee?.city || "Not specified"}
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          ID: {application.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {application.type}
                  </TableCell>
                  <TableCell className="text-center">
                    {application.programName}
                  </TableCell>
                  <TableCell className="text-center">
                    {new Date(application.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={`${getStatusColor(application.status)} border`}
                    >
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {application.status === "Pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove?.(application)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject?.(application)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === application.id.toString() && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <PendingFranchiseDetails
                        application={application}
                        expandedRows={expandedChildren}
                        onToggleRow={toggleRow}
                      />
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
            No applications found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
