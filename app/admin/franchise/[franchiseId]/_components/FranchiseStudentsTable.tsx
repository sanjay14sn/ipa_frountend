"use client";

import { useState } from "react";
import type { StudentData } from "@/services/student.service";
import { useAdminStudentsByFranchise } from "@/hooks/api/student.hooks";
import EditStudentModal from "@/components/students/EditStudentModal";
import StudentsTable from "@/components/students/StudentsTable";

interface FranchiseStudentsTableProps {
  franchiseId: string;
}

export function FranchiseStudentsTable({ franchiseId }: FranchiseStudentsTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelId, setLevelId] = useState<number | undefined>(undefined);
  const [idStatus, setIdStatus] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading } = useAdminStudentsByFranchise(
    franchiseId || null,
    {
      page,
      limit: 10,
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      levelId,
      idStatus: idStatus === "all" || !idStatus ? undefined : idStatus,
      sortBy,
      sortOrder,
    },
  );

  const students = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <StudentsTable
        mode="admin"
        students={students}
        meta={meta}
        currentPage={page}
        onPageChange={(p) => setPage(p)}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        levelId={levelId}
        idStatus={idStatus ?? "all"}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        onFilterChange={(key, value) => {
          if (key === "status")   { setStatusFilter(value); setPage(1); }
          if (key === "level")    { setLevelId(value === "all" ? undefined : Number(value)); setPage(1); }
          if (key === "idStatus") { setIdStatus(value === "all" ? undefined : value); setPage(1); }
        }}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
          setPage(1);
        }}
        onStudentEdit={(student) => {
          setEditStudent(student);
          setIsEditModalOpen(true);
        }}
      />

      <EditStudentModal
        mode="admin"
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        student={editStudent}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditStudent(null);
        }}
      />

    </>
  );
}
