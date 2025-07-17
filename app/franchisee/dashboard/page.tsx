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
} from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";

export default function FranchiseeDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
  }, []);

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
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {pendingOrders} pending orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contests</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CONTESTS.length}</div>
            <p className="text-xs text-muted-foreground">Available contests</p>
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
            <div className="space-y-2">
              {["Beginner", "Intermediate", "Advanced"].map((level) => {
                const count = franchiseStudents.filter(
                  (s) => s.level === level
                ).length;
                return (
                  <div key={level} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {level}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                );
              })}
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
