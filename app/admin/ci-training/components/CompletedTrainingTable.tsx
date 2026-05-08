"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/shared";
import {
  CITrainingData,
  CITrainingByFranchise,
} from "@/services/course-instructor.service";
import InstructorDetails from "./InstructorDetails";

type FranchiseTrainingRow = readonly [string, string, CITrainingData[]];

interface CompletedTrainingTableProps {
  data: CITrainingByFranchise;
}

export default function CompletedTrainingTable({
  data,
}: CompletedTrainingTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const completedData = useMemo(() => {
    const filtered: CITrainingByFranchise = {};
    Object.entries(data).forEach(([franchiseName, instructors]) => {
      const completedInstructors = instructors.filter(
        (instructor) => instructor.isApproved,
      );
      if (completedInstructors.length > 0) {
        filtered[franchiseName] = completedInstructors;
      }
    });
    return filtered;
  }, [data]);

  const franchiseEntries = useMemo<FranchiseTrainingRow[]>(() => {
    return Object.entries(completedData).map(([franchiseName, instructors]) => {
      const franchiseId =
        instructors[0]?.franchise?.id ??
        `fn-${franchiseName.replace(/\s+/g, "_")}`;
      return [String(franchiseId), franchiseName, instructors] as const;
    });
  }, [completedData]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return franchiseEntries.filter(([, franchiseName, instructors]) => {
      return (
        franchiseName.toLowerCase().includes(term) ||
        instructors.some((instructor) => {
          const name = (
            instructor.instructorName ??
            instructor.name ??
            ""
          ).toLowerCase();
          return (
            name.includes(term) ||
            instructor.instructorId.toLowerCase().includes(term)
          );
        })
      );
    });
  }, [franchiseEntries, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const totalInstructors = filteredData.reduce(
    (total, [, , instructors]) => total + instructors.length,
    0,
  );

  const columns: DataTableColumn<FranchiseTrainingRow>[] = [
    {
      key: "franchise",
      header: "Franchise",
      className: "w-[320px]",
    },
    {
      key: "completedCount",
      header: "Completed",
      className: "text-center",
      render: ([, , instructors]) => (
        <Badge className="border border-green-200 bg-green-100 text-green-700">
          {instructors.length}
        </Badge>
      ),
    },
    {
      key: "trainingType",
      header: "Training Type",
      className: "text-center text-sm text-gray-600",
      render: ([, , instructors]) => instructors[0]?.trainingLevelName || "N/A",
    },
  ];

  return (
    <DataTable<FranchiseTrainingRow>
      data={paginatedData}
      columns={columns}
      getRowId={([franchiseId]) => franchiseId}
      renderMainCell={([, franchiseName, instructors]) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{franchiseName}</div>
          <div className="text-sm text-gray-500">
            {instructors.length} instructor
            {instructors.length !== 1 ? "s" : ""} completed training
          </div>
        </div>
      )}
      renderExpandedContent={(row) => (
        <InstructorDetails
          instructors={row[2]}
          lastRow={paginatedData[paginatedData.length - 1]?.[0] === row[0]}
          isCompleted
        />
      )}
      searchPlaceholder="Search franchises, instructors, or IDs..."
      onSearchChange={(value) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }}
      pagination={{ total: filteredData.length, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={itemsPerPage}
      emptyMessage="No completed training records found matching your criteria"
      resultsText={(count, total) =>
        `Showing ${count} of ${total} franchises with ${totalInstructors} instructors who have completed training`
      }
    />
  );
}
