"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  ShoppingCart,
  Trophy,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { User, getUserFromStorage } from "@/lib/auth";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState({
    franchises: [],
    students: [],
    orders: [],
    contests: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchDashboardData(userData);
    }
  }, []);

  const fetchDashboardData = async (userData: User) => {
    try {
      const franchiseParam =
        userData.role === "franchise"
          ? `?franchiseId=${userData.franchiseId}`
          : "";

      const [franchisesRes, studentsRes, ordersRes, contestsRes] =
        await Promise.all([
          fetch("/api/franchises"),
          fetch(`/api/students${franchiseParam}`),
          fetch(`/api/orders${franchiseParam}`),
          fetch("/api/contests"),
        ]);

      const [franchisesData, studentsData, ordersData, contestsData] =
        await Promise.all([
          franchisesRes.json(),
          studentsRes.json(),
          ordersRes.json(),
          contestsRes.json(),
        ]);

      setData({
        franchises: franchisesData.franchises || [],
        students: studentsData.students || [],
        orders: ordersData.orders || [],
        contests: contestsData.contests || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
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

  const stats =
    user?.role === "admin"
      ? [
          {
            title: "Total Franchises",
            value: data.franchises.length.toString(),
            change: "+2 this month",
            icon: Building2,
            color: "text-blue-600",
          },
          {
            title: "Total Students",
            value: data.students.length.toString(),
            change: "+89 this week",
            icon: Users,
            color: "text-emerald-600",
          },
          {
            title: "Pending Orders",
            value: data.orders
              .filter((o: any) => o.status === "Pending")
              .length.toString(),
            change: "5 urgent",
            icon: ShoppingCart,
            color: "text-amber-600",
          },
          {
            title: "Active Contests",
            value: data.contests
              .filter((c: any) => c.status !== "Completed")
              .length.toString(),
            change: "Next: March 15",
            icon: Trophy,
            color: "text-slate-600",
          },
        ]
      : [
          {
            title: "My Students",
            value: data.students.length.toString(),
            change: "+5 this month",
            icon: Users,
            color: "text-emerald-600",
          },
          {
            title: "My Orders",
            value: data.orders.length.toString(),
            change: "2 pending",
            icon: ShoppingCart,
            color: "text-amber-600",
          },
          {
            title: "Available Contests",
            value: data.contests
              .filter((c: any) => c.status !== "Completed")
              .length.toString(),
            change: "Register now",
            icon: Trophy,
            color: "text-slate-600",
          },
          {
            title: "This Month Revenue",
            value: "₹45,000",
            change: "+12% from last month",
            icon: TrendingUp,
            color: "text-blue-600",
          },
        ];

  const activities =
    user?.role === "admin"
      ? [
          {
            franchise: "Mumbai Central",
            action: "New student enrolled",
            time: "2 hours ago",
            type: "student",
          },
          {
            franchise: "Delhi North",
            action: "Order materials delivered",
            time: "4 hours ago",
            type: "order",
          },
          {
            franchise: "Bangalore East",
            action: "New student enrolled",
            time: "6 hours ago",
            type: "student",
          },
          {
            franchise: "Chennai South",
            action: "Course Instructor certification completed",
            time: "1 day ago",
            type: "courseInstructor",
          },
        ]
      : [
          {
            franchise: user?.franchiseName || "",
            action: "Student Aarav completed Level 2",
            time: "1 hour ago",
            type: "student",
          },
          {
            franchise: user?.franchiseName || "",
            action: "Order materials shipped",
            time: "3 hours ago",
            type: "order",
          },
          {
            franchise: user?.franchiseName || "",
            action: "Enrolled in Regional Speed Contest",
            time: "1 day ago",
            type: "contest",
          },
          {
            franchise: user?.franchiseName || "",
            action: "New Course Instructor added",
            time: "2 days ago",
            type: "courseInstructor",
          },
        ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {user?.role === "admin" ? "Admin Dashboard" : "Franchise Dashboard"}
        </h1>
        <p className="text-gray-600 mt-1">
          {user?.role === "admin"
            ? "Welcome back! Here's what's happening across your franchise network."
            : `Welcome back, ${user?.name}! Here's your franchise overview.`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="col-span-4 border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900">Recent Activity</CardTitle>
            <CardDescription className="text-gray-600">
              {user?.role === "admin"
                ? "Latest updates from your franchise network"
                : "Latest updates from your franchise"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1 space-y-1">
                    {user?.role === "admin" && (
                      <p className="text-sm font-medium leading-none text-gray-900">
                        {activity.franchise}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">{activity.action}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="bg-gray-50 border-gray-300 text-gray-700 text-xs"
                    >
                      {activity.type}
                    </Badge>
                    <div className="text-sm text-gray-500">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3 border-gray-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900">Quick Actions</CardTitle>
            <CardDescription className="text-gray-600">
              Common tasks and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {user?.role === "admin" ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-gray-700">
                    5 urgent orders need attention
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-gray-700">
                    Student enrollment up 12% this month
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Trophy className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-700">
                    3 contests scheduled for next week
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-gray-700">
                    2 pending orders to track
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span className="text-gray-700">
                    {data.students.length} active students
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Trophy className="h-4 w-4 text-blue-500" />
                  <span className="text-gray-700">
                    Register for upcoming contests
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
