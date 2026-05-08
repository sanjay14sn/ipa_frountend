"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared";
import type {
  DataTableColumn,
  DataTableSortOption,
} from "@/components/shared";
import {
  getPaginatedStudentsAdmin,
  type StudentData,
} from "@/services/student.service";

interface FranchiseStudentsTableProps {
  franchiseId: string;
}

export function FranchiseStudentsTable({
  franchiseId,
}: FranchiseStudentsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const limit = 10;

  const listParams = useMemo(
    () => ({
      page: currentPage,
      limit,
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
      franchiseId: franchiseId.trim() || undefined,
    }),
    [currentPage, limit, searchTerm, sortBy, sortOrder, franchiseId],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students-franchise", listParams],
    queryFn: () => getPaginatedStudentsAdmin(listParams),
    enabled: franchiseId.trim().length > 0,
  });

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  const columns: DataTableColumn<StudentData>[] = useMemo(
    () => [
      { key: "rollNo", header: "Roll no." },
      {
        key: "program",
        header: "Program",
        render: (s) => String(s.programId ?? "—"),
      },
      {
        key: "active",
        header: "Active",
        className: "text-center",
        render: (s) => (
          <Badge variant={s.isActive ? "secondary" : "outline"}>
            {s.isActive ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        key: "idCard",
        header: "ID",
        className: "text-center",
        render: (s) => <span className="text-sm">{s.idIssued}</span>,
      },
    ],
    [],
  );

  const sortOptions: DataTableSortOption[] = [
    { value: "id", label: "ID" },
    { value: "name", label: "Name" },
    { value: "rollNo", label: "Roll no." },
    { value: "createdAt", label: "Joined" },
  ];

  return (
    <DataTable<StudentData>
      data={rows}
      loading={isLoading}
      columns={columns}
      getRowId={(s) => String(s.id)}
      renderMainCell={(s) => (
        <div className="flex flex-col">
          <span className="font-medium text-card-foreground">{s.name}</span>
          <span className="text-sm text-muted-foreground">
            {s.mail || s.rollNo}
          </span>
        </div>
      )}
      searchPlaceholder="Search by name or roll number…"
      onSearchChange={(s) => {
        setSearchTerm(s);
        setCurrentPage(1);
      }}
      sortOptions={sortOptions}
      defaultSortBy="id"
      defaultSortOrder="DESC"
      onSortChange={(by, ord) => {
        setSortBy(by);
        setSortOrder(ord as "ASC" | "DESC");
        setCurrentPage(1);
      }}
      pagination={{ total, totalPages }}
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      itemsPerPage={limit}
      emptyMessage="No students for this franchise."
      resultsText={(count, tot) =>
        `${count} student${tot === 1 ? "" : "s"} (total ${tot})`
      }
    />
  );
}
