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
  Search,
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Trash2,
  Edit2,
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import { STUDENTS, Student } from "@/lib/data";
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
import { Select } from "@/components/ui/select";

export default function FranchiseeStudentsPage() {
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({
    name: "",
    age: "",
    level: "Beginner",
    status: "Active",
  });
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchStudents(userData);
    }
  }, []);

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
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLevelColor = (level: string) => {
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

  const activeStudents = franchiseStudents.filter(
    (s) => s.status === "Active"
  ).length;
  const newThisMonth = franchiseStudents.filter((s) => {
    const enrollmentDate = new Date(s.enrollmentDate);
    const thisMonth = new Date();
    return (
      enrollmentDate.getMonth() === thisMonth.getMonth() &&
      enrollmentDate.getFullYear() === thisMonth.getFullYear()
    );
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Students</h1>
          <p className="text-muted-foreground">
            Manage your franchise students - {user.franchiseName}
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="font-sans">
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
              <DialogDescription>
                Enter the details of the new student below.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!user) return;
                const payload = {
                  name: newStudent.name,
                  age: newStudent.age,
                  level: newStudent.level,
                  franchiseId: user.franchiseId,
                  franchiseName: user.franchiseName,
                  status: newStudent.status,
                };
                const res = await fetch("/api/students", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  await fetchStudents(user);
                  setNewStudent({
                    name: "",
                    age: "",
                    level: "Beginner",
                    status: "Active",
                  });
                  setIsAddModalOpen(false);
                } else {
                  alert("Failed to add student");
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  required
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Student Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <Input
                  required
                  type="number"
                  min={1}
                  value={newStudent.age}
                  onChange={(e) =>
                    setNewStudent((s) => ({ ...s, age: e.target.value }))
                  }
                  placeholder="Age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Level</label>
                <select
                  className="w-full border rounded px-2 py-1 bg-white"
                  value={newStudent.level}
                  onChange={(e) =>
                    setNewStudent((s) => ({ ...s, level: e.target.value }))
                  }
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full border rounded px-2 py-1 bg-white"
                  value={newStudent.status}
                  onChange={(e) =>
                    setNewStudent((s) => ({ ...s, status: e.target.value }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <DialogFooter>
                <Button type="submit">Add Student</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Students by Level */}
      <Card>
        <CardHeader>
          <CardTitle>Students by Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {["Beginner", "Intermediate", "Advanced"].map((level) => {
              const count = franchiseStudents.filter(
                (s) => s.level === level
              ).length;
              return (
                <div
                  key={level}
                  className="text-center p-4 bg-gray-50 rounded-lg"
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{level}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Students Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Students List</CardTitle>
              <CardDescription>Your franchise students</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.age}</TableCell>
                  <TableCell>
                    <Badge
                      className={getLevelColor(student.level)}
                      variant="secondary"
                    >
                      {student.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(student.enrollmentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.status === "Active" ? "default" : "secondary"
                      }
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      onClick={() => {
                        setEditStudent(student);
                        setIsEditModalOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteStudentId(student.id);
                        setIsDeleteModalOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
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
      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update the details of the student below.
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
                  name: editStudent.name,
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
                <label className="block text-sm font-medium mb-1">Age</label>
                <Input
                  required
                  type="number"
                  min={1}
                  value={editStudent.age}
                  onChange={(e) =>
                    setEditStudent((s) =>
                      s ? { ...s, age: Number(e.target.value) } : s
                    )
                  }
                  placeholder="Age"
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
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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
