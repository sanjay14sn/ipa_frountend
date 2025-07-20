"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDENTS, COURSE_INSTRUCTORS, ORDERS, CONTESTS } from "@/lib/data";
import {
  Users,
  GraduationCap,
  ShoppingCart,
  Trophy,
  Calendar,
  TrendingUp,
  Plus,
  UserPlus,
  Package,
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FranchiseeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);

    // Redirect to agreement if onboarding not completed
    if (userData?.role === "franchise" && !userData?.onboardingCompleted) {
      router.push("/franchisee/agreement");
      return;
    }
  }, [router]);

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  // Filter data for current franchise
  const franchiseStudents = STUDENTS.filter(
    (s) => s.franchiseId === user.franchiseId
  );
  const franchiseCourseInstructors = COURSE_INSTRUCTORS.filter(
    (ci) => ci.franchiseId === user.franchiseId
  );
  const franchiseOrders = ORDERS.filter(
    (o) => o.franchiseId === user.franchiseId
  );

  // Calculate stats
  const totalStudents = franchiseStudents.length;
  const totalCourseInstructors = franchiseCourseInstructors.length;
  const totalOrders = franchiseOrders.length;
  const pendingOrders = franchiseOrders.filter(
    (order) => order.status === "Pending"
  ).length;
  const approvedCourseInstructors = franchiseCourseInstructors.filter(
    (ci) => ci.status === "Approved"
  ).length;
  const pendingCourseInstructors = franchiseCourseInstructors.filter(
    (ci) => ci.status === "Pending"
  ).length;

  // Recent activity
  const recentOrders = franchiseOrders.slice(0, 3);
  const recentStudents = franchiseStudents.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Franchise Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome to {user.franchiseName} - Overview of your franchise
          activities
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/franchisee/students/add">
              <Button
                className="w-full h-auto p-4 flex-col space-y-2"
                variant="outline"
              >
                <UserPlus className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium">Register Student</span>
              </Button>
            </Link>
            <Link href="/franchisee/course-instructors/add">
              <Button
                className="w-full h-auto p-4 flex-col space-y-2"
                variant="outline"
              >
                <GraduationCap className="w-6 h-6 text-green-600" />
                <span className="text-sm font-medium">Add Instructor</span>
              </Button>
            </Link>
            <Link href="/franchisee/orders">
              <Button
                className="w-full h-auto p-4 flex-col space-y-2"
                variant="outline"
              >
                <Package className="w-6 h-6 text-purple-600" />
                <span className="text-sm font-medium">Place Order</span>
              </Button>
            </Link>
            <Link href="/franchisee/students">
              <Button
                className="w-full h-auto p-4 flex-col space-y-2"
                variant="outline"
              >
                <Users className="w-6 h-6 text-orange-600" />
                <span className="text-sm font-medium">Manage Students</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Course Instructors
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedCourseInstructors}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingCourseInstructors} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Contests
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CONTESTS.length}</div>
            <p className="text-xs text-muted-foreground">Participate now</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Elementary Levels (EL1-EL6) */}
              <div>
                <h4 className="text-xs font-semibold text-green-700 mb-1">
                  Elementary (EL)
                </h4>
                <div className="space-y-1">
                  {["EL1", "EL2", "EL3", "EL4", "EL5", "EL6"].map((level) => {
                    const count = franchiseStudents.filter(
                      (s) => s.level === level
                    ).length;
                    if (count > 0) {
                      return (
                        <div key={level} className="flex justify-between pl-2">
                          <span className="text-xs text-muted-foreground">
                            {level}
                          </span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {/* Regular Levels (RL1-RL10) */}
              <div>
                <h4 className="text-xs font-semibold text-blue-700 mb-1">
                  Regular (RL)
                </h4>
                <div className="space-y-1">
                  {[
                    "RL1",
                    "RL2",
                    "RL3",
                    "RL4",
                    "RL5",
                    "RL6",
                    "RL7",
                    "RL8",
                    "RL9",
                    "RL10",
                  ].map((level) => {
                    const count = franchiseStudents.filter(
                      (s) => s.level === level
                    ).length;
                    if (count > 0) {
                      return (
                        <div key={level} className="flex justify-between pl-2">
                          <span className="text-xs text-muted-foreground">
                            {level}
                          </span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {/* Grand Master Levels (GML1-GML3) */}
              <div>
                <h4 className="text-xs font-semibold text-purple-700 mb-1">
                  Grand Master (GML)
                </h4>
                <div className="space-y-1">
                  {["GML1", "GML2", "GML3"].map((level) => {
                    const count = franchiseStudents.filter(
                      (s) => s.level === level
                    ).length;
                    if (count > 0) {
                      return (
                        <div key={level} className="flex justify-between pl-2">
                          <span className="text-xs text-muted-foreground">
                            {level}
                          </span>
                          <span className="text-xs font-medium">{count}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>

              {/* Legacy levels (for backward compatibility) */}
              {franchiseStudents.some((s) =>
                ["Beginner", "Intermediate", "Advanced"].includes(s.level)
              ) && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">
                    Legacy
                  </h4>
                  <div className="space-y-1">
                    {["Beginner", "Intermediate", "Advanced"].map((level) => {
                      const count = franchiseStudents.filter(
                        (s) => s.level === level
                      ).length;
                      if (count > 0) {
                        return (
                          <div
                            key={level}
                            className="flex justify-between pl-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {level}
                            </span>
                            <span className="text-xs font-medium">{count}</span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Show message if no students */}
              {franchiseStudents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No students enrolled yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {["Pending", "Processing", "Shipped", "Delivered"].map(
                (status) => {
                  const count = franchiseOrders.filter(
                    (o) => o.status === status
                  ).length;
                  return (
                    <div key={status} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {status}
                      </span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CI Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                "ABACUS",
                "BRAIN TREE",
                "PHONICS",
                "VEDIC MATHS",
                "HANDWRITING",
              ].map((program) => {
                const count = franchiseCourseInstructors.filter(
                  (ci) => ci.programName === program
                ).length;
                if (count > 0) {
                  return (
                    <div key={program} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {program}
                      </span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{order.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{order.amount}</p>
                      <p
                        className={`text-xs ${
                          order.status === "Delivered"
                            ? "text-green-600"
                            : order.status === "Pending"
                            ? "text-yellow-600"
                            : "text-blue-600"
                        }`}
                      >
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentStudents.length > 0 ? (
                recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Age {student.age} • {student.level}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {student.enrollmentDate}
                      </p>
                      <p className="text-xs text-green-600">{student.status}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No students enrolled yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
