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
import { STUDENTS, Student } from "@/lib/data";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FranchiseeStudentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);

    // Redirect to agreement if onboarding not completed
    if (userData?.role === "franchise" && !userData?.onboardingCompleted) {
      router.push("/franchisee/agreement");
      return;
    }

    if (userData) {
      fetchStudents(userData);
    }
  }, [router]);

  const fetchStudents = async (userData: any) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/students?franchiseId=${userData.franchiseId}`
      );
      const data = await response.json();
      setStudents((data.students || []) as Student[]);
    } catch (error) {
      // Optionally handle error
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  // Filter students for current franchise
  const franchiseStudents = students.filter(
    (s) => s.franchiseId === user.franchiseId
  );

  const filteredStudents = franchiseStudents.filter(
    (student) =>
      (student.name || student.studentName)
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      student.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.rollNo || "")
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (student.fatherName || "")
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (student.motherName || "")
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (level: string) => {
    if (level.startsWith("EL")) return "bg-green-100 text-green-800";
    if (level.startsWith("RL")) return "bg-blue-100 text-blue-800";
    if (level.startsWith("GML")) return "bg-purple-100 text-purple-800";

    // Legacy levels
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    return normalizedStatus === "active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-50 text-gray-600 border-gray-200";
  };

  const activeStudents = franchiseStudents.filter(
    (s) => s.status?.toLowerCase() === "active"
  ).length;

  const newThisMonth = franchiseStudents.filter((s) => {
    const enrollmentDate = new Date(s.enrollmentDate);
    const thisMonth = new Date();
    return (
      enrollmentDate.getMonth() === thisMonth.getMonth() &&
      enrollmentDate.getFullYear() === thisMonth.getFullYear()
    );
  }).length;

  const StudentCard = ({ student }: { student: Student }) => (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {student.studentName || student.name}
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {student.rollNo && (
                  <Badge variant="outline" className="text-xs">
                    {student.rollNo}
                  </Badge>
                )}
                <span>Age {student.age}</span>
                {student.standard && <span>• {student.standard}</span>}
                {student.sex && <span>• {student.sex}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getLevelColor(student.level)} variant="secondary">
              {student.level}
            </Badge>
            <Badge
              className={getStatusColor(student.status || "active")}
              variant="outline"
            >
              {student.status || "Active"}
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
                {student.fatherName || "Not provided"}
              </p>
              {student.fatherOccupation && (
                <p>
                  <span className="text-muted-foreground">Occupation:</span>{" "}
                  {student.fatherOccupation}
                </p>
              )}
              {student.fatherContactNo && (
                <p className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                  {student.fatherContactNo}
                </p>
              )}
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
                {student.motherName || "Not provided"}
              </p>
              {student.motherOccupation && (
                <p>
                  <span className="text-muted-foreground">Occupation:</span>{" "}
                  {student.motherOccupation}
                </p>
              )}
              {student.motherContactNo && (
                <p className="flex items-center">
                  <Phone className="w-3 h-3 mr-1 text-muted-foreground" />
                  {student.motherContactNo}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {(student.mailId || student.residentialAddress) && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Contact Information
            </h4>
            <div className="text-sm space-y-1">
              {student.mailId && (
                <p className="flex items-center">
                  <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                  {student.mailId}
                </p>
              )}
              {student.residentialAddress && (
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  {student.residentialAddress}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Academic & Status */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <div className="text-sm font-medium">
                {student.stream || "Regular"}
              </div>
              <div className="text-xs text-muted-foreground">Stream</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <div className="text-sm font-medium">
                {new Date(student.enrollmentDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground">Enrolled</div>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-lg">
              <CreditCard className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <div className="text-sm font-medium">
                {student.canRequestCertificate ? "Yes" : "No"}
              </div>
              <div className="text-xs text-muted-foreground">Cert Eligible</div>
            </div>
            {student.isDiscontinued && (
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                <div className="text-sm font-medium">Discontinued</div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-2 border-t">
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
              setDeleteStudentId(student.id);
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
            Manage your franchise students - {user.franchiseName}
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
          <Link href="/franchisee/students/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchiseStudents.length}</div>
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
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, roll number, level, or parent name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Display */}
      {viewMode === "cards" ? (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
          {filteredStudents.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No students found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first student."}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Table View
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Details</TableHead>
                  <TableHead>Parents</TableHead>
                  <TableHead>Level & Standard</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {student.studentName || student.name}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          {student.rollNo && (
                            <Badge variant="outline" className="text-xs">
                              {student.rollNo}
                            </Badge>
                          )}
                          <span>Age {student.age}</span>
                          {student.sex && <span>• {student.sex}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>
                          <strong>F:</strong> {student.fatherName || "N/A"}
                        </div>
                        <div>
                          <strong>M:</strong> {student.motherName || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          className={getLevelColor(student.level)}
                          variant="secondary"
                        >
                          {student.level}
                        </Badge>
                        {student.standard && (
                          <div className="text-sm text-muted-foreground">
                            {student.standard}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {student.mailId && (
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            <span className="truncate max-w-[150px]">
                              {student.mailId}
                            </span>
                          </div>
                        )}
                        {student.fatherContactNo && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {student.fatherContactNo}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusColor(student.status || "active")}
                        variant="outline"
                      >
                        {student.status || "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditStudent(student);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteStudentId(student.id);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm
                          ? "No students found matching your search."
                          : "No students enrolled yet."}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Student Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Complete information for{" "}
              {selectedStudent?.studentName || selectedStudent?.name}
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
                    <p className="font-medium">
                      {selectedStudent.rollNo || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date of Birth
                    </p>
                    <p className="font-medium">
                      {selectedStudent.dob
                        ? new Date(selectedStudent.dob).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="font-medium">
                      {selectedStudent.sex || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Standard</p>
                    <p className="font-medium">
                      {selectedStudent.standard || "Not specified"}
                    </p>
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
                          {selectedStudent.fatherName || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Qualification
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherQualification ||
                            "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupation
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherOccupation || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Contact Number
                        </p>
                        <p className="font-medium">
                          {selectedStudent.fatherContactNo || "Not provided"}
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
                          {selectedStudent.motherName || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Qualification
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherQualification ||
                            "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Occupation
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherOccupation || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Contact Number
                        </p>
                        <p className="font-medium">
                          {selectedStudent.motherContactNo || "Not provided"}
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
                    <p className="font-medium">
                      {selectedStudent.mailId || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Residential Address
                    </p>
                    <p className="font-medium">
                      {selectedStudent.residentialAddress || "Not provided"}
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
                      {selectedStudent.canRequestCertificate
                        ? "Eligible"
                        : "Not Eligible"}
                    </div>
                    <div className="text-xs text-purple-600">Certificate</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="font-semibold text-orange-700">
                      {selectedStudent.isDiscontinued
                        ? "Discontinued"
                        : "Active"}
                    </div>
                    <div className="text-xs text-orange-600">Status</div>
                  </div>
                </div>
              </div>

              {selectedStudent.isDiscontinued &&
                selectedStudent.discontinueReason && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-2">
                      Discontinuation Reason
                    </h4>
                    <p className="text-sm text-orange-700">
                      {selectedStudent.discontinueReason}
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
                const payload = {
                  id: editStudent.id,
                  studentName: editStudent.studentName || editStudent.name,
                  age: editStudent.age,
                  level: editStudent.level,
                  status: editStudent.status,
                };
                const res = await fetch("/api/students", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  await fetchStudents(user);
                  setIsEditModalOpen(false);
                  setEditStudent(null);
                } else {
                  alert("Failed to update student");
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  required
                  value={editStudent.studentName || editStudent.name}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s
                        ? {
                            ...s,
                            studentName: e.target.value,
                            name: e.target.value,
                          }
                        : s
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
                      s ? { ...s, level: e.target.value } : s
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
                  value={editStudent.status}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s
                        ? {
                            ...s,
                            status: e.target.value as "Active" | "Inactive",
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
                const res = await fetch(`/api/students?id=${deleteStudentId}`, {
                  method: "DELETE",
                });
                if (res.ok) {
                  await fetchStudents(user);
                  setIsDeleteModalOpen(false);
                  setDeleteStudentId(null);
                } else {
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
    </div>
  );
}
