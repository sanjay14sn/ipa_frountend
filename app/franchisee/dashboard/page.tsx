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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { MetricCard } from "@/components/metric-card";

export default function FranchiseeDashboard() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    // Redirect to agreement if onboarding not completed
    if (user?.role === "franchisee" && user?.franchiseStatus === "Pending") {
      router.push("/franchisee/agreement");
      return;
    }
  }, [router]);

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  // Filter data for current franchise
  const franchiseStudents = STUDENTS.filter(
    (s) => s.franchiseId === user.franchiseId?.toString()
  );
  const franchiseCourseInstructors = COURSE_INSTRUCTORS.filter(
    (ci) => ci.franchiseId === user.franchiseId?.toString()
  );
  const franchiseOrders = ORDERS.filter(
    (o) => o.franchiseId === user.franchiseId?.toString()
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

  const stats = [
    {
      label: "Total Students",
      value: totalStudents.toString(),
      delta: "Active enrollment",
      positive: true,
      icon: Users,
      accent: "emerald" as const,
    },
    {
      label: "Course Instructors",
      value: approvedCourseInstructors.toString(),
      delta:
        pendingCourseInstructors > 0
          ? `${pendingCourseInstructors} pending`
          : "All approved",
      positive: pendingCourseInstructors === 0,
      icon: GraduationCap,
      accent: "emerald" as const,
    },
    {
      label: "Total Orders",
      value: totalOrders.toString(),
      delta: pendingOrders > 0 ? `${pendingOrders} pending` : "All processed",
      positive: pendingOrders === 0,
      icon: ShoppingCart,
      accent: "emerald" as const,
    },
    {
      label: "Available Contests",
      value: CONTESTS.length.toString(),
      delta: "Ready to participate",
      positive: true,
      icon: Trophy,
      accent: "emerald" as const,
    },
  ];

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

      {/* Profile Information */}
      {user.profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Franchisee Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Personal Information
                  </h4>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Name:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Phone:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Email:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.mail}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        City:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.city}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Franchise Details
                  </h4>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Franchise Name:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.franchise.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Type:
                      </span>
                      <span className="text-sm font-medium">
                        {user.profile.franchise.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status:
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          ["Active", "Approved"].includes(
                            user.profile.franchise.status
                          )
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {user.profile.franchise.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Approved:
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(
                          user.profile.franchise.approvedAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        DOB:
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(user.profile.dob).toLocaleDateString()}
                      </span>
                    </div>
                    {(user.profile.franchise.franchisePayrolls?.[0]?.dateOfJoining || 
                      user.profile.franchise.franchisePayroll?.dateOfJoining) && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          DOJ:
                        </span>
                        <span className="text-sm font-medium">
                          {new Date(
                            user.profile.franchise.franchisePayrolls?.[0]?.dateOfJoining ||
                            user.profile.franchise.franchisePayroll?.dateOfJoining
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {(user.profile.franchise.franchisePayrolls?.[0] || 
                  user.profile.franchise.franchisePayroll) && (
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Payroll
                    </h4>
                    <div className="space-y-2 mt-2">
                      {user.profile.franchise.franchisePayrolls && user.profile.franchise.franchisePayrolls.length > 0 ? (
                        user.profile.franchise.franchisePayrolls.map((payroll: any, idx: number) => (
                          <div key={idx} className={idx > 0 ? "mt-4 pt-4 border-t" : ""}>
                            {payroll.franchiseProgram?.program?.name && (
                              <div className="text-xs font-semibold text-muted-foreground mb-2">
                                {payroll.franchiseProgram.program.name}
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Franchise Fee:
                                </span>
                                <span className="text-sm font-medium">
                                  ₹{payroll.franchiseFee.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Monthly Fee:
                                </span>
                                <span className="text-sm font-medium">
                                  ₹{payroll.monthlyFee.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Royalty:
                                </span>
                                <span className="text-sm font-medium">
                                  {payroll.royalty}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Franchise Fee:
                            </span>
                            <span className="text-sm font-medium">
                              ₹
                              {user.profile.franchise.franchisePayroll?.franchiseFee.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Monthly Fee:
                            </span>
                            <span className="text-sm font-medium">
                              ₹
                              {user.profile.franchise.franchisePayroll?.monthlyFee.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Royalty:
                            </span>
                            <span className="text-sm font-medium">
                              {user.profile.franchise.franchisePayroll?.royalty}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            delta={stat.delta}
            positive={stat.positive}
            icon={stat.icon}
            accent={stat.accent}
          />
        ))}
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
