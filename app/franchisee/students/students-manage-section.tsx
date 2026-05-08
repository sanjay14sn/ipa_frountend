"use client";

import { useState } from "react";
import { AlertTriangle, CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function StudentsManageSection() {
  const { user } = useUser();
  const { students, isLoading, revalidate } = useStudents();
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestIdModalOpen, setIsRequestIdModalOpen] = useState(false);

  if (!user || !user.franchiseId) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading students...
      </div>
    );
  }

  const hasRequestableIds = students.some(
    (student) => student.idIssued === StudentIdStatus.NOT_ISSUED,
  );

  return (
    <>
      <StudentsTable
        students={students}
        onStudentUpdate={() => {
          void revalidate();
        }}
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

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this student? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={async () => {
                if (!deleteStudentId) return;
                try {
                  await deleteStudentWithRevalidation(Number(deleteStudentId));
                  setIsDeleteModalOpen(false);
                  setDeleteStudentId(null);
                  void revalidate();
                } catch (error) {
                  console.error("Error deleting student:", error);
                  alert("Failed to delete student");
                }
              }}
            >
              Delete
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
