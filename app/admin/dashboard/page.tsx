"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FRANCHISES,
  STUDENTS,
  COURSE_INSTRUCTORS,
  ORDERS,
  CONTESTS,
} from "@/lib/data";
import {
  Building2,
  Users,
  GraduationCap,
  ShoppingCart,
  Trophy,
} from "lucide-react";

export default function AdminDashboard() {
  const totalFranchises = FRANCHISES.length;
  const totalStudents = STUDENTS.length;
  const totalCourseInstructors = COURSE_INSTRUCTORS.length;
  const totalOrders = ORDERS.length;
  const totalContests = CONTESTS.length;

  const pendingOrders = ORDERS.filter(
    (order) => order.status === "Pending"
  ).length;
  const pendingCourseInstructors = COURSE_INSTRUCTORS.filter(
    (ci) => ci.status === "Pending"
  ).length;
  const upcomingContests = CONTESTS.filter(
    (contest) =>
      contest.status === "Upcoming" || contest.status === "Registration Open"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all franchises and their activities
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Franchises
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFranchises}</div>
            <p className="text-xs text-muted-foreground">Active franchises</p>
          </CardContent>
        </Card>

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
              Course Instructors
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourseInstructors}</div>
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
            <div className="text-2xl font-bold">{totalContests}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingContests} upcoming
            </p>
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
              {ORDERS.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{order.franchise}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.type}
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
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {COURSE_INSTRUCTORS.filter((ci) => ci.status === "Pending")
                .slice(0, 5)
                .map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{ci.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ci.programName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{ci.franchiseName}</p>
                      <p className="text-xs text-yellow-600">Pending</p>
                    </div>
                  </div>
                ))}
              {COURSE_INSTRUCTORS.filter((ci) => ci.status === "Pending")
                .length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No pending approvals
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
