"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Trash2,
  Edit2,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  BookOpen,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import {
  StudentData,
  StudentLevel,
  StudentStream,
  StudentIdStatus,
} from "@/services/student.service";
import {
  useStudents,
  deleteStudentWithRevalidation,
  updateStudentWithRevalidation,
} from "@/hooks/use-students";
import AddStudentModal from "./components/AddStudentModal";
import StudentsTable from "./components/StudentsTable";
import RequestIdModal from "./components/RequestIdModal";
import RequestedIdStudentsModal from "./components/RequestedIdStudentsModal";

export default function FranchiseeStudentsPage() {
  const router = useRouter();
  const { user: contextUser } = useUser();
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRequestIdModalOpen, setIsRequestIdModalOpen] = useState(false);
  const [isRequestedIdStudentsModalOpen, setIsRequestedIdStudentsModalOpen] =
    useState(false);
  const { user } = useUser();

  // Use SWR for data fetching
  const { students, isLoading, revalidate } = useStudents();

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading students...</div>;
  }

  const getLevelColor = (level: StudentLevel) => {
    if (level.startsWith("EL")) return "bg-green-100 text-green-800";
    if (level.startsWith("RL")) return "bg-blue-100 text-blue-800";
    if (level.startsWith("GML")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-50 text-gray-600 border-gray-200";
  };

  const activeStudents = students.filter((s) => s.isActive).length;

  const newThisMonth = students.filter((s) => {
    const enrollmentDate = new Date(s.createdAt);
    const thisMonth = new Date();
    return (
      enrollmentDate.getMonth() === thisMonth.getMonth() &&
      enrollmentDate.getFullYear() === thisMonth.getFullYear()
    );
  }).length;

  // Helper function to calculate age
  const calculateAge = (dateOfBirth: Date): number => {
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

  const StudentCard = ({ student }: { student: StudentData }) => (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{student.name}</CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {student.rollNo}
                </Badge>
                <span>Age {calculateAge(student.dateOfBirth)}</span>
                <span>• {student.standard}</span>
                <span>• {student.sex}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getLevelColor(student.level)} variant="secondary">
              {student.level}
            </Badge>
            <Badge
              className={getStatusColor(student.isActive)}
              variant="outline"
            >
              {student.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Parent Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Father's Details
            </h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {student.fatherName}
              </p>
              <p>
                <span className="text-muted-foreground">Occupation:</span>{" "}
                {student.fatherOccupation}
              </p>
              <p className="flex items-center">
                <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                {student.fatherContactNo}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Mother's Details
            </h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Name:</span>{" "}
                {student.motherName}
              </p>
              <p>
                <span className="text-muted-foreground">Occupation:</span>{" "}
                {student.motherOccupation}
              </p>
              <p className="flex items-center">
                <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                {student.motherContactNo}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Contact Information
          </h4>
          <div className="text-sm space-y-1">
            <p className="flex items-center">
              <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
              {student.mail}
            </p>
            <p>
              <span className="text-muted-foreground">Address:</span>{" "}
              {student.residentialAddress}
            </p>
          </div>
        </div>

        {/* Academic & Status */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="text-sm font-medium">{student.stream}</div>
              <div className="text-xs text-muted-foreground">Stream</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="text-sm font-medium">
                {new Date(student.createdAt).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">Enrolled</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <CreditCard className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <div className="text-sm font-medium">{student.idIssued}</div>
              <div className="text-xs text-muted-foreground">ID Status</div>
            </div>
            {!student.isActive && (
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                <div className="text-sm font-medium">Inactive</div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t">
          {student.idIssued === StudentIdStatus.NOT_ISSUED && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequestIdModalOpen(true)}
              className="border-primary/20 text-primary hover:bg-primary/10"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Request ID
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent(student);
              setIsDetailModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditStudent(student);
              setIsEditModalOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteStudentId(student.id.toString());
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
          <p className="text-muted-foreground">
            Manage your franchise students -{" "}
            {contextUser?.profile?.franchise?.name || user?.franchiseName}
            {contextUser?.profile && (
              <span className="block text-sm text-muted-foreground mt-1">
                Franchisee: {contextUser.profile.name} •{" "}
                {contextUser.profile.phone} • {contextUser.profile.city}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              Table
            </Button>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">In your franchise</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              New This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newThisMonth}</div>
            <p className="text-xs text-muted-foreground">Recently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need ID Cards</CardTitle>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <Button size="sm" onClick={() => setIsRequestIdModalOpen(true)}>
                Request IDs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                students.filter(
                  (s) => s.idIssued === StudentIdStatus.NOT_ISSUED
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Without ID cards</p>
            {students.filter((s) => s.idIssued === StudentIdStatus.REQUESTED)
              .length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setIsRequestedIdStudentsModalOpen(true)}
              >
                View{" "}
                {
                  students.filter(
                    (s) => s.idIssued === StudentIdStatus.REQUESTED
                  ).length
                }{" "}
                Requested
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students Display */}
      {viewMode === "cards" ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {students.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
            {students.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">
                  No students found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first student.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Tree View Table
        <StudentsTable
          students={students}
          onStudentUpdate={(updatedStudent) => {
            // SWR will automatically revalidate, but we can trigger it manually if needed
            revalidate();
          }}
          onStudentDelete={(studentId) => {
            setDeleteStudentId(studentId);
            setIsDeleteModalOpen(true);
          }}
          onStudentEdit={(student) => {
            setEditStudent(student);
            setIsEditModalOpen(true);
          }}
          onRequestIds={() => setIsRequestIdModalOpen(true)}
        />
      )}

      {/* Student Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{selectedStudent.rollNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="font-medium">
                      {new Date(
                        selectedStudent.dateOfBirth
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">{selectedStudent.sex}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Standard</p>
                    <p className="font-medium">{selectedStudent.standard}</p>
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Parent Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Father's Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {selectedStudent.fatherName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Qualification
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherQualification}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupation
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherOccupation}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Contact Number
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherContactNo}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Mother's Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {selectedStudent.motherName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Qualification
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherQualification}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupation
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherOccupation}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Contact Number
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherContactNo}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Contact & Address */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Contact & Address
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Email Address
                    </p>
                    <p className="font-medium">{selectedStudent.mail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Residential Address
                    </p>
                    <p className="font-medium">
                      {selectedStudent.residentialAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Status */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Academic Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="font-semibold text-blue-700">
                      {selectedStudent.level}
                    </div>
                    <div className="text-xs text-blue-600">Current Level</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="font-semibold text-green-700">
                      {selectedStudent.stream || "Regular"}
                    </div>
                    <div className="text-xs text-green-600">Stream</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="font-semibold text-purple-700">
                      {selectedStudent.idIssued}
                    </div>
                    <div className="text-xs text-purple-600">ID Status</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-700">
                      {selectedStudent.isActive ? "Active" : "Inactive"}
                    </div>
                    <div className="text-xs text-orange-600">Status</div>
                  </div>
                </div>
              </div>

              {!selectedStudent.isActive && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">
                    Student Status
                  </h4>
                  <p className="text-sm text-orange-700">
                    This student is currently inactive
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keep existing Edit and Delete modals */}
      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update basic student information.
            </DialogDescription>
          </DialogHeader>
          {editStudent && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user || !editStudent) return;
                try {
                  await updateStudentWithRevalidation(editStudent.id, {
                    name: editStudent.name,
                    level: editStudent.level,
                    isActive: editStudent.isActive,
                  });
                  setIsEditModalOpen(false);
                  setEditStudent(null);
                } catch (error) {
                  console.error("Error updating student:", error);
                  alert("Failed to update student");
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  required
                  value={editStudent.name}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s ? { ...s, name: e.target.value } : s
                    )
                  }
                  placeholder="Student Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Level</label>
                <select
                  className="w-full border rounded px-2 py-1 bg-white"
                  value={editStudent.level}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s ? { ...s, level: e.target.value as StudentLevel } : s
                    )
                  }
                >
                  <option value="EL1">EL1</option>
                  <option value="EL2">EL2</option>
                  <option value="EL3">EL3</option>
                  <option value="RL1">RL1</option>
                  <option value="RL2">RL2</option>
                  <option value="RL3">RL3</option>
                  <option value="RL4">RL4</option>
                  <option value="RL5">RL5</option>
                  <option value="GML1">GML1</option>
                  <option value="GML2">GML2</option>
                  <option value="GML3">GML3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded px-2 py-1 bg-white"
                  value={editStudent.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s
                        ? {
                            ...s,
                            isActive: e.target.value === "active",
                          }
                        : s
                    )
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Update Student</Button>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Student Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this student? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!user || !deleteStudentId) return;
                try {
                  await deleteStudentWithRevalidation(Number(deleteStudentId));
                  setIsDeleteModalOpen(false);
                  setDeleteStudentId(null);
                } catch (error) {
                  console.error("Error deleting student:", error);
                  alert("Failed to delete student");
                }
              }}
            >
              Delete
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student Modal */}
      <AddStudentModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false);
          revalidate(); // SWR will automatically refresh the data
        }}
      />

      {/* Request ID Modal */}
      <RequestIdModal
        open={isRequestIdModalOpen}
        onOpenChange={setIsRequestIdModalOpen}
        students={students}
        onSuccess={() => {
          setIsRequestIdModalOpen(false);
          revalidate(); // SWR will automatically refresh the data
        }}
      />

      {/* Requested ID Students Modal */}
      <RequestedIdStudentsModal
        open={isRequestedIdStudentsModalOpen}
        onOpenChange={setIsRequestedIdStudentsModalOpen}
        students={students}
      />
    </div>
  );
}
