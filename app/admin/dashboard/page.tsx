"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  GraduationCap,
  ShoppingCart,
  Trophy,
} from "lucide-react";
import CountBar from "./components/countBar";
import { RecentApplications } from "./components/recentApplications";

export default function AdminDashboard() {
  const [data, setData] = useState({
    franchises: [],
    students: [],
    courseInstructors: [],
    orders: [],
    contests: [],
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [franchisesRes, studentsRes, cisRes, ordersRes, contestsRes] =
        await Promise.all([
          fetch("/api/franchises"),
          fetch("/api/students"),
          fetch("/api/course-instructors"),
          fetch("/api/orders"),
          fetch("/api/contests"),
        ]);

      const [franchisesData, studentsData, cisData, ordersData, contestsData] =
        await Promise.all([
          franchisesRes.json(),
          studentsRes.json(),
          cisRes.json(),
          ordersRes.json(),
          contestsRes.json(),
        ]);

      setData({
        franchises: franchisesData.franchises || [],
        students: studentsData.students || [],
        courseInstructors: cisData.courseInstructors || [],
        orders: ordersData.orders || [],
        contests: contestsData.contests || [],
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-64"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalFranchises = data.franchises.length;
  const totalStudents = data.students.length;
  const totalCourseInstructors = data.courseInstructors.length;
  const totalOrders = data.orders.length;
  const totalContests = data.contests.length;

  const pendingOrders = data.orders.filter(
    (order: any) => order.status === "Pending"
  ).length;
  const pendingCourseInstructors = data.courseInstructors.filter(
    (ci: any) => ci.status === "Pending"
  ).length;
  const upcomingContests = data.contests.filter(
    (contest: any) =>
      contest.status === "Upcoming" || contest.status === "Registration Open"
  ).length;

  const stats = [
    {
      label: "Total Franchises",
      value: totalFranchises.toString(),
      icon: Building2,
    },
    { label: "Total Students", value: totalStudents.toString(), icon: Users },
    {
      label: "Course Instructors",
      value: totalCourseInstructors.toString(),
      delta:
        pendingCourseInstructors > 0
          ? `${pendingCourseInstructors} pending`
          : "All approved",
      positive: pendingCourseInstructors === 0,
      icon: GraduationCap,
    },
    {
      label: "Total Orders",
      value: totalOrders.toString(),
      delta: pendingOrders > 0 ? `${pendingOrders} pending` : "All processed",
      positive: pendingOrders === 0,
      icon: ShoppingCart,
    },
    {
      label: "Contests",
      value: totalContests.toString(),
      delta:
        upcomingContests > 0
          ? `${upcomingContests} upcoming`
          : "None scheduled",
      positive: upcomingContests > 0,
      icon: Trophy,
    },
  ] as const;

  const categories = [
    { label: "Fr", count: totalFranchises },
    { label: "St", count: totalStudents },
    { label: "Ci", count: totalCourseInstructors },
    { label: "Or", count: totalOrders },
    { label: "Co", count: totalContests },
  ];

  const max = Math.max(...categories.map((item) => item.count));
  const legendItems = [
    { label: "Fr", name: "Franchises" },
    { label: "St", name: "Students" },
    { label: "Ci", name: "Course Instructors" },
    { label: "Or", name: "Orders" },
    { label: "Co", name: "Contests" },
  ];

  return (
    <div className="p-6 space-y-6 min-h-full rounded-md bg-background/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">
            Overview of all franchises and their activities
          </p>
        </div>
      </div>

      <div className="flex flex-row gap-5">
        <div>
          <div className=" max-w-4xl mx-auto bg-white rounded-md p-6 border border-primary">
            {/* Header */}
            <div className="flex flex-col gap-3 flex-row items-center justify-between">
              <h2 className="text-xl font-semibold">Statistics</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-600">
                {legendItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
                    <span>
                      <span className="font-medium">{item.label}</span>:{" "}
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bars row */}
            <div className="flex justify-center mt-10 gap-5">
              {categories.map((item) => (
                <CountBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  max={max}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="w-full flex flex-col gap-5">
          <RecentApplications />
        </div>
      </div>
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.orders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {order.franchise}
                    </p>
                    <p className="text-xs text-gray-600">{order.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {order.amount}
                    </p>
                    <p
                      className={`text-xs ${
                        order.status === "Delivered"
                          ? "text-green-600"
                          : order.status === "Pending"
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    >
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
              {data.orders.length === 0 && (
                <p className="text-sm text-gray-600">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <Link
              href="/admin/pending-approvals"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.courseInstructors
                .filter((ci: any) => ci.status === "Pending")
                .slice(0, 5)
                .map((ci: any) => (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ci.name}
                      </p>
                      <p className="text-xs text-gray-600">{ci.programName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {ci.franchiseName}
                      </p>
                      <p className="text-xs text-orange-600">Pending</p>
                    </div>
                  </div>
                ))}
              {data.courseInstructors.filter(
                (ci: any) => ci.status === "Pending"
              ).length === 0 && (
                <p className="text-sm text-gray-600">No pending approvals</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
