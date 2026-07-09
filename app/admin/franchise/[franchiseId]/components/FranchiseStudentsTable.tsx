"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialog";
import type { StudentData } from "@/services/student.service";
import {
  deleteStudentWithRevalidation,
  useAdminStudentsByFranchise,
} from "@/hooks/api/student.hooks";
import EditStudentModal from "@/components/students/EditStudentModal";
import StudentsTable from "@/components/students/StudentsTable";
import { sendClientLog } from "@/lib/client-telemetry";

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
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
        onStudentDelete={(studentId) => {
          setDeleteStudentId(studentId);
          setIsDeleteModalOpen(true);
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

      <ConfirmDialog
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        variant="destructive"
        title="Delete Student"
        description="Are you sure you want to delete this student? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteStudentId) return;
          try {
            await deleteStudentWithRevalidation(Number(deleteStudentId));
            setIsDeleteModalOpen(false);
            setDeleteStudentId(null);
          } catch (error) {
            sendClientLog({ level: "error", event: "student-delete-error", message: "Error deleting student", context: { error } });
            toast.error("Failed to delete student");
          }
        }}
      />
    </>
  );
}
