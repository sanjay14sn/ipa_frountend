"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import StudentsTable from "./components/StudentsTable";
import {
  StudentData,
  getAllStudents,
  activateStudent,
  deactivateStudent,
  deleteStudent,
  issueStudentId,
} from "@/services/student.service";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await getAllStudents();
      setStudents(response.result || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (student: StudentData) => {
    setSelectedStudent(student);
    setActionType("activate");
    setActionMessage(`Are you sure you want to activate ${student.name}?`);
    setIsActionModalOpen(true);
  };

  const handleDeactivate = async (student: StudentData) => {
    setSelectedStudent(student);
    setActionType("deactivate");
    setActionMessage(`Are you sure you want to deactivate ${student.name}?`);
    setIsActionModalOpen(true);
  };

  const handleDelete = async (student: StudentData) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleIssueId = async (student: StudentData) => {
    setSelectedStudent(student);
    setActionType("issueId");
    setActionMessage(`Are you sure you want to issue ID for ${student.name}?`);
    setIsActionModalOpen(true);
  };

  const handleEdit = async (student: StudentData) => {
    // TODO: Implement edit functionality
    console.log("Edit student:", student);
  };

  const confirmAction = async () => {
    if (!selectedStudent) return;

    try {
      switch (actionType) {
        case "activate":
          await activateStudent(selectedStudent.id);
          break;
        case "deactivate":
          await deactivateStudent(selectedStudent.id);
          break;
        case "issueId":
          await issueStudentId(selectedStudent.id);
          break;
      }

      await fetchStudents();
      setIsActionModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error performing action:", error);
    }
  };

  const confirmDelete = async () => {
    if (!selectedStudent) return;

    try {
      await deleteStudent(selectedStudent.id);
      await fetchStudents();
      setIsDeleteModalOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  // Calculate statistics
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.isActive).length;
  const inactiveStudents = students.filter((s) => !s.isActive).length;
  const idIssuedStudents = students.filter(
    (s) => s.idIssued === "Issued"
  ).length;
  const idPendingStudents = students.filter(
    (s) => s.idIssued === "Requested"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            All Students Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all students across all franchises. Students are
            added by franchisees.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across all franchises
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inactive Students
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveStudents}</div>
            <p className="text-xs text-muted-foreground">
              Not currently enrolled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID Issued</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{idIssuedStudents}</div>
            <p className="text-xs text-muted-foreground">Students with IDs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{idPendingStudents}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting ID issuance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Students Across Franchises</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentsTable
            students={students}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onIssueId={handleIssueId}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStudent?.name}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "activate" && "Activate Student"}
              {actionType === "deactivate" && "Deactivate Student"}
              {actionType === "issueId" && "Issue Student ID"}
            </DialogTitle>
            <DialogDescription>{actionMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
