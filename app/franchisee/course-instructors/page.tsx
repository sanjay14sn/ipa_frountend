"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Users, UserCheck, Clock, Eye } from "lucide-react";
import { User, getUserFromStorage } from "@/lib/auth";
import { CourseInstructor, COURSE_INSTRUCTORS } from "@/lib/data";

export default function CourseInstructorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courseInstructors, setCourseInstructors] = useState<
    CourseInstructor[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchCourseInstructors(userData);
    }
  }, []);

  const fetchCourseInstructors = async (userData: User) => {
    setLoading(true);
    try {
      const franchiseParam =
        userData.role === "franchise"
          ? `?franchiseId=${userData.franchiseId}`
          : "";
      const response = await fetch(`/api/course-instructors${franchiseParam}`);
      const data = await response.json();
      setCourseInstructors(
        (data.courseInstructors || []) as CourseInstructor[]
      );
    } catch (error) {
      console.error("Error fetching course instructors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInstructors = courseInstructors.filter((instructor) => {
    const matchesSearch =
      instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.programName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.franchiseName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (instructor.uniqueCiCode &&
        instructor.uniqueCiCode
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "All" || instructor.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getActiveStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Inactive":
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getInstallmentProgress = (instructor: CourseInstructor) => {
    if (instructor.status !== "Approved" || instructor.installment === 0) {
      return { percentage: 0, text: "N/A" };
    }
    const percentage =
      (instructor.completedInstallments / instructor.installment) * 100;
    return {
      percentage,
      text: `${instructor.completedInstallments}/${instructor.installment}`,
    };
  };

  const handleApprove = async (instructorId: string) => {
    // Implementation for approval workflow
    console.log("Approving instructor:", instructorId);
    // This would call API to approve and generate CI Code
  };

  const handleReject = async (instructorId: string) => {
    // Implementation for rejection workflow
    console.log("Rejecting instructor:", instructorId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const stats = {
    total: courseInstructors.length,
    approved: courseInstructors.filter((ci) => ci.status === "Approved").length,
    pending: courseInstructors.filter((ci) => ci.status === "Pending").length,
    active: courseInstructors.filter((ci) => ci.activeStatus === "Active")
      .length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {user?.role === "admin"
              ? "Course Instructors"
              : "My Course Instructors"}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.role === "admin"
              ? "Manage course instructors across all franchises"
              : "Manage your franchise course instructors"}
          </p>
        </div>
        {user?.role === "franchise" && (
          <Button
            onClick={() => router.push("/dashboard/course-instructors/add")}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Course Instructor
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Course Instructors
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.total}
            </div>
            <p className="text-xs text-gray-500">
              {user?.role === "admin"
                ? "Across all franchises"
                : "In your franchise"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Approved
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.approved}
            </div>
            <p className="text-xs text-gray-500">With CI codes generated</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.pending}
            </div>
            <p className="text-xs text-gray-500">Awaiting admin approval</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Active Instructors
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.active}
            </div>
            <p className="text-xs text-gray-500">Currently teaching</p>
          </CardContent>
        </Card>
      </div>

      {/* Course Instructors List */}
      <Card className="border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-gray-900">
                Course Instructors Directory
              </CardTitle>
              <CardDescription className="text-gray-600">
                {user?.role === "admin"
                  ? "All course instructors across franchises"
                  : "Your franchise course instructors"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {/* Status Filter */}
              <div className="flex space-x-2">
                {["All", "Pending", "Approved", "Rejected"].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status as any)}
                    className={
                      statusFilter === status
                        ? "bg-gray-900 hover:bg-gray-800 text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
              {/* Search */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-gray-700 font-medium">
                  Name & Program
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Contact
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Status
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  CI Code
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Payment Progress
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Training Progress
                </TableHead>
                {user?.role === "admin" && (
                  <TableHead className="text-gray-700 font-medium">
                    Franchise
                  </TableHead>
                )}
                <TableHead className="text-gray-700 font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.map((instructor) => {
                const installmentProgress = getInstallmentProgress(instructor);
                return (
                  <TableRow
                    key={instructor.id}
                    className="border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell>
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900">
                          {instructor.name}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs border-gray-300 text-gray-700 bg-gray-50"
                        >
                          {instructor.programName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {instructor.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {instructor.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(
                            instructor.status
                          )}`}
                        >
                          {instructor.status}
                        </Badge>
                        {instructor.status === "Approved" && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getActiveStatusColor(
                              instructor.activeStatus
                            )}`}
                          >
                            {instructor.activeStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {instructor.uniqueCiCode ? (
                        <Badge
                          variant="outline"
                          className="font-mono text-xs bg-slate-50 border-slate-300 text-slate-700"
                        >
                          {instructor.uniqueCiCode}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-[120px]">
                        {instructor.status === "Approved" &&
                        instructor.installment > 0 ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">
                                Installments
                              </span>
                              <span className="text-gray-900 font-medium">
                                {installmentProgress.text}
                              </span>
                            </div>
                            <Progress
                              value={installmentProgress.percentage}
                              className="h-1.5"
                            />
                            <div className="text-xs text-gray-500">
                              ₹
                              {instructor.paymentDetails.amount.toLocaleString()}{" "}
                              paid
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {instructor.status === "Pending"
                              ? "Pending approval"
                              : "No payments"}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">
                          {
                            instructor.trainingLevels.filter((t) => t.completed)
                              .length
                          }
                          /{instructor.trainingLevels.length} levels
                        </div>
                        <div className="text-xs text-gray-500">
                          Competition: {instructor.competitionRegn || "None"}
                        </div>
                      </div>
                    </TableCell>
                    {user?.role === "admin" && (
                      <TableCell className="text-sm text-gray-700">
                        {instructor.franchiseName}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex space-x-2">
                        {user?.role === "admin" &&
                          instructor.status === "Pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(instructor.id)}
                                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(instructor.id)}
                                className="text-red-700 border-red-300 hover:bg-red-50 text-xs"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          onClick={() =>
                            router.push(
                              `/dashboard/course-instructors/${instructor.id}`
                            )
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
