"use client";

import React, { useState, useMemo } from "react";
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
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  CITrainingData,
  CITrainingByFranchise,
} from "@/services/course-instructor.service";
import InstructorDetails from "./InstructorDetails";

interface PendingTrainingTableProps {
  data: CITrainingByFranchise;
  onCompleteTraining: (instructor: CITrainingData) => void;
}

export default function PendingTrainingTable({
  data,
  onCompleteTraining,
}: PendingTrainingTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter to only show pending training
  const pendingData = useMemo(() => {
    const filtered: CITrainingByFranchise = {};
    Object.entries(data).forEach(([franchiseName, instructors]) => {
      const pendingInstructors = instructors.filter(
        (instructor) => !instructor.isApproved
      );
      if (pendingInstructors.length > 0) {
        filtered[franchiseName] = pendingInstructors;
      }
    });
    return filtered;
  }, [data]);

  // Convert object to array - use franchiseId for row keys (avoids hyphen/space issues in names like "IPA - Santhome")
  const franchiseEntries = useMemo(() => {
    return Object.entries(pendingData).map(([franchiseName, instructors]) => {
      const franchiseId = instructors[0]?.franchise?.id ?? `fn-${franchiseName.replace(/\s+/g, "_")}`;
      return [String(franchiseId), franchiseName, instructors] as const;
    });
  }, [pendingData]);

  // Filter data
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return franchiseEntries.filter(([, franchiseName, instructors]) => {
      const matchesSearch =
        franchiseName.toLowerCase().includes(term) ||
        instructors.some(
          (instructor) =>
            instructor.instructorName.toLowerCase().includes(term) ||
            instructor.instructorId.toLowerCase().includes(term)
        );
      return matchesSearch;
    });
  }, [franchiseEntries, searchTerm]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const totalInstructors = filteredData.reduce(
    (total, [, instructors]) => total + instructors.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search franchises, instructors, or IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {paginatedData.length} of {filteredData.length} franchises with{" "}
        {totalInstructors} instructors currently in training
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary hover:bg-secondary">
              <TableHead className="w-[300px]">Franchise</TableHead>
              <TableHead className="text-center">In Training</TableHead>
              <TableHead className="text-center">Training Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map(([franchiseId, franchiseName, instructors], index) => (
              <React.Fragment key={franchiseId}>
                <TableRow className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRow(franchiseId)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRow === franchiseId ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">
                          {franchiseName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instructors.length} instructor
                          {instructors.length !== 1 ? "s" : ""} in training
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      {instructors.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {instructors[0]?.trainingLevelName || "N/A"}
                  </TableCell>
                </TableRow>

                {/* Expanded Details Row */}
                {expandedRow === franchiseId && (
                  <TableRow>
                    <TableCell colSpan={3} className="p-0">
                      <InstructorDetails
                        instructors={instructors}
                        lastRow={index === paginatedData.length - 1}
                        onCompleteTraining={onCompleteTraining}
                        isCompleted={false}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No instructors currently in training found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
}
