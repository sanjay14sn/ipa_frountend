"use client";

import { useState } from "react";
import { PageSkeleton } from "@/components/shared";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import type { StudentData } from "@/services/student.service";
import { StudentIdStatus } from "@/services/student.service";
import { useStudents } from "@/hooks/api/student.hooks";
import AddStudentModal from "./components/AddStudentModal";
import EditStudentModal from "@/components/students/EditStudentModal";
import RequestIdModal from "./components/RequestIdModal";
import StudentsTable from "@/components/students/StudentsTable";
import { useListParams } from "@/hooks/use-list-params";

export function StudentsManageSection() {
  const { user } = useUser();

  // List state lives in the URL (SW-P10) — filters survive refresh/back and
  // coexist with the hub's ?tab= param.
  const listParams = useListParams({
    filterDefaults: { status: "all", level: "all", idStatus: "all" },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  const page = listParams.page;
  const search = listParams.search;
  const statusFilter = listParams.filters.status;
  const levelId =
    listParams.filters.level === "all"
      ? undefined
      : Number(listParams.filters.level);
  const idStatus =
    listParams.filters.idStatus === "all"
      ? undefined
      : listParams.filters.idStatus;
  const sortBy = listParams.sortBy ?? "createdAt";
  const sortOrder = (listParams.sortOrder === "asc" ? "ASC" : "DESC") as
    | "ASC"
    | "DESC";
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestIdModalOpen, setIsRequestIdModalOpen] = useState(false);

  if (!user || !user.franchiseId) {
    return <PageSkeleton />;
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
        onPageChange={listParams.setPage}
        searchValue={search}
        onSearchChange={listParams.setSearch}
        statusFilter={statusFilter}
        levelId={levelId}
        idStatus={idStatus ?? "all"}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        onFilterChange={(key, value) => {
          if (key === "status" || key === "level" || key === "idStatus") {
            listParams.setFilter(key, value);
          }
        }}
        onSortChange={(newSortBy, newSortOrder) => {
          listParams.setSort(
            newSortBy,
            newSortOrder === "ASC" ? "asc" : "desc",
          );
        }}
        onStudentUpdate={() => void revalidate()}
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
