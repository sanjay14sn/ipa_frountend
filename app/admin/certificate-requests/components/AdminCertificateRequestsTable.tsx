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
  ChevronRight,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  AdminCertificateRequest,
  AdminCertificateRequestsByFranchise,
} from "@/services/student.service";
import { useToast } from "@/hooks/use-toast";
import {
  approveCertificateRequestWithRevalidation,
  rejectCertificateRequestWithRevalidation,
} from "@/hooks/use-students";

interface AdminCertificateRequestsTableProps {
  certificateRequestsByFranchise?: AdminCertificateRequestsByFranchise;
  onRefresh?: () => void;
}

export default function AdminCertificateRequestsTable({
  certificateRequestsByFranchise,
  onRefresh,
}: AdminCertificateRequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [franchiseFilter, setFranchiseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"requestDate" | "studentName" | "marks">(
    "requestDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();

  // Flatten the grouped data into a single array
  const allRequests = useMemo(() => {
    if (!certificateRequestsByFranchise) return [];
    return Object.values(certificateRequestsByFranchise).flat();
  }, [certificateRequestsByFranchise]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = allRequests.filter((request) => {
      const matchesSearch =
        request.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.studentRollNo
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.instructorName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        request.franchiseName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;

      const matchesFranchise =
        franchiseFilter === "all" || request.franchiseName === franchiseFilter;

      return matchesSearch && matchesStatus && matchesFranchise;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "requestDate":
          comparison =
            new Date(a.requestDate).getTime() -
            new Date(b.requestDate).getTime();
          break;
        case "studentName":
          comparison = a.studentName.localeCompare(b.studentName);
          break;
        case "marks":
          const aPercentage = (a.marksObtained / a.totalMarks) * 100;
          const bPercentage = (b.marksObtained / b.totalMarks) * 100;
          comparison = aPercentage - bPercentage;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [
    allRequests,
    searchTerm,
    statusFilter,
    franchiseFilter,
    sortBy,
    sortOrder,
  ]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("RL"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    if (level.startsWith("GML"))
      return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
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
  const uniqueFranchises = [
    ...new Set(
      allRequests?.map((request) => request.franchiseName).filter(Boolean)
    ),
  ];

  const handleApprove = async (requestId: number) => {
    try {
      await approveCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request approved successfully",
      });
      onRefresh?.();
    } catch (error) {
      console.error("Error approving certificate request:", error);
      toast({
        title: "Error",
        description: "Failed to approve certificate request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await rejectCertificateRequestWithRevalidation(requestId);
      toast({
        title: "Success",
        description: "Certificate request rejected successfully",
      });
      onRefresh?.();
    } catch (error) {
      console.error("Error rejecting certificate request:", error);
      toast({
        title: "Error",
        description: "Failed to reject certificate request",
        variant: "destructive",
      });
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
              placeholder="Search by student name, roll number, instructor, or franchise..."
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Franchise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Franchises</SelectItem>
                {uniqueFranchises.map((franchise) => (
                  <SelectItem key={franchise} value={franchise}>
                    {franchise}
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
            onValueChange={(value: "requestDate" | "studentName" | "marks") =>
              setSortBy(value)
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requestDate">Request Date</SelectItem>
              <SelectItem value="studentName">Student Name</SelectItem>
              <SelectItem value="marks">Marks</SelectItem>
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
        Showing {paginatedData.length} of {filteredData.length} certificate
        requests
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[250px]">Student</TableHead>
              <TableHead className="text-center">Instructor</TableHead>
              <TableHead className="text-center">Franchise</TableHead>
              <TableHead className="text-center">Marks & Percentage</TableHead>
              <TableHead className="text-center">Request Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((request) => (
              <TableRow key={request.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex flex-col">
                    <div className="font-medium text-gray-900">
                      {request.studentName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {request.studentRollNo} • Age{" "}
                      {calculateAge(request.studentDateOfBirth)} •{" "}
                      {request.studentSex}
                    </div>
                    <div className="text-xs text-primary font-medium">
                      {request.studentStandard} • {request.studentStream}
                    </div>
                    <Badge
                      className={`${getLevelColor(
                        request.studentLevel
                      )} border text-xs mt-1 w-fit`}
                    >
                      {request.studentLevel}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div className="font-medium">{request.instructorName}</div>
                    <div className="text-gray-500">
                      ID: {request.instructorId}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm font-medium">
                    {request.franchiseName}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div className="font-medium">
                      {request.marksObtained}/{request.totalMarks}
                    </div>
                    <div className="text-gray-500">
                      {(
                        (request.marksObtained / request.totalMarks) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div className="flex items-center justify-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>
                        {new Date(request.requestDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.requestDate).toLocaleTimeString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${getStatusColor(request.status)} border`}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {request.status === "Pending" ? (
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        className="h-8 w-8 p-0"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge
                      className={`${getStatusColor(request.status)} border`}
                    >
                      {request.status}
                    </Badge>
                  )}
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
            No certificate requests found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
