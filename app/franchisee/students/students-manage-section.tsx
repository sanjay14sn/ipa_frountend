"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialog";
import { useUser } from "@/context/user-context";
import type { StudentData } from "@/services/student.service";
import { StudentIdStatus } from "@/services/student.service";
import {
  deleteStudentWithRevalidation,
  useStudents,
} from "@/hooks/api/student.hooks";
import AddStudentModal from "./components/AddStudentModal";
import EditStudentModal from "./components/EditStudentModal";
import RequestIdModal from "./components/RequestIdModal";
import StudentsTable from "./components/StudentsTable";
import { sendClientLog } from "@/lib/client-telemetry";

export function StudentsManageSection() {
  const { user } = useUser();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelId, setLevelId] = useState<number | undefined>(undefined);
  const [idStatus, setIdStatus] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const ITEMS_PER_PAGE = 10;

  const { students, meta, isLoading, revalidate } = useStudents({
    page,
    limit: ITEMS_PER_PAGE,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    levelId,
    idStatus: idStatus === "all" || !idStatus ? undefined : idStatus,
    sortBy,
    sortOrder,
  });

  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestIdModalOpen, setIsRequestIdModalOpen] = useState(false);

  if (!user || !user.franchiseId) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  const hasRequestableIds = students.some(
    (student) => student.idIssued === StudentIdStatus.NOT_ISSUED,
  );

  return (
    <>
      <StudentsTable
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
        onStudentUpdate={() => void revalidate()}
        onStudentDelete={(studentId) => {
          setDeleteStudentId(studentId);
          setIsDeleteModalOpen(true);
        }}
        onStudentEdit={(student) => {
          setEditStudent(student);
          setIsEditModalOpen(true);
        }}
        toolbarActions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRequestIdModalOpen(true)}
              disabled={!hasRequestableIds}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Request IDs
            </Button>
            <Button type="button" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </>
        }
      />

      <EditStudentModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        student={editStudent}
        onSuccess={() => {
          setIsEditModalOpen(false);
          setEditStudent(null);
          void revalidate();
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
            void revalidate();
          } catch (error) {
            sendClientLog({ level: "error", event: "student-delete-error", message: "Error deleting student", context: { error } });
            toast.error("Failed to delete student");
          }
        }}
      />

      <AddStudentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          void revalidate();
        }}
      />

      <RequestIdModal
        open={isRequestIdModalOpen}
        onOpenChange={setIsRequestIdModalOpen}
        students={students}
        onSuccess={() => {
          setIsRequestIdModalOpen(false);
          void revalidate();
        }}
      />
    </>
  );
}
