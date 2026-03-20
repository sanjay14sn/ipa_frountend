"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  GraduationCap,
  ShoppingCart,
  Award,
  FileText,
  Package,
  CreditCard,
  Truck,
  BookOpen,
  ChevronRight,
  Clock,
  UserCheck,
  Layers,
} from "lucide-react";
import { RecentApplications } from "./components/recentApplications";
import {
  getAdminDashboardStats,
  type DashboardStats,
} from "@/services/dashboard.service";
import { getAllOrdersAdmin, type OrderData } from "@/services/order.service";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}

function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-400 rounded-lg p-5 flex items-start gap-4">
      <div className="p-2.5 bg-gray-50 rounded-md shrink-0">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface ModuleCardProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

function ModuleCard({ href, icon: Icon, label, description }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-400 rounded-lg p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="p-2.5 bg-gray-50 rounded-md shrink-0 group-hover:bg-gray-100 transition-colors">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </Link>
  );
}

const EMPTY_STATS: DashboardStats = {
  franchises: { total: 0, pending: 0 },
  students: { total: 0, active: 0 },
  courseInstructors: { total: 0, pending: 0 },
  orders: { total: 0, pending: 0 },
  certificates: { total: 0, pending: 0 },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getAdminDashboardStats(),
        getAllOrdersAdmin({ limit: 5 }),
      ]);
      setStats({
        franchises: { ...EMPTY_STATS.franchises, ...statsData?.franchises },
        students: { ...EMPTY_STATS.students, ...statsData?.students },
        courseInstructors: {
          ...EMPTY_STATS.courseInstructors,
          ...statsData?.courseInstructors,
        },
        orders: { ...EMPTY_STATS.orders, ...statsData?.orders },
        certificates: { ...EMPTY_STATS.certificates, ...statsData?.certificates },
      });
      const flat = Object.values(ordersData.data ?? {}).flat();
      setRecentOrders(flat.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCardProps[] = [
    {
      label: "Total Franchises",
      value: stats.franchises.total.toString(),
      sub:
        stats.franchises.pending > 0
          ? `${stats.franchises.pending} pending`
          : undefined,
      icon: Building2,
    },
    {
      label: "Total Students",
      value: stats.students.total.toString(),
      sub:
        stats.students.active > 0
          ? `${stats.students.active} active`
          : undefined,
      icon: Users,
    },
    {
      label: "Course Instructors",
      value: stats.courseInstructors.total.toString(),
      sub:
        stats.courseInstructors.pending > 0
          ? `${stats.courseInstructors.pending} pending`
          : undefined,
      icon: GraduationCap,
    },
    {
      label: "Total Orders",
      value: stats.orders.total.toString(),
      sub:
        stats.orders.pending > 0
          ? `${stats.orders.pending} pending`
          : undefined,
      icon: ShoppingCart,
    },
    {
      label: "Certificates",
      value: stats.certificates.total.toString(),
      sub:
        stats.certificates.pending > 0
          ? `${stats.certificates.pending} pending`
          : undefined,
      icon: Award,
    },
  ];

  const modules: ModuleCardProps[] = [
    {
      href: "/admin/franchises",
      icon: Building2,
      label: "Franchises",
      description: "View and manage all franchises",
    },
    {
      href: "/admin/pending-approvals",
      icon: Clock,
      label: "Pending Approvals",
      description: "Review franchise applications",
    },
    {
      href: "/admin/course-instructor-approvals",
      icon: UserCheck,
      label: "CI Approvals",
      description: "Course instructor applications",
    },
    {
      href: "/admin/ci-training",
      icon: BookOpen,
      label: "CI Training",
      description: "Manage training sessions",
    },
    {
      href: "/admin/training-levels",
      icon: Layers,
      label: "Training Levels",
      description: "Configure training level settings",
    },
    {
      href: "/admin/orders",
      icon: ShoppingCart,
      label: "Orders",
      description: "View and manage all orders",
    },
    {
      href: "/admin/inventory",
      icon: Package,
      label: "Inventory",
      description: "Manage inventory items",
    },
    {
      href: "/admin/certificate-requests",
      icon: Award,
      label: "Certificates",
      description: "Certificate request management",
    },
    {
      href: "/admin/id-requests",
      icon: FileText,
      label: "ID Requests",
      description: "Student ID card requests",
    },
    {
      href: "/admin/payments",
      icon: CreditCard,
      label: "Payments",
      description: "Payment records and billing",
    },
    {
      href: "/admin/shipping",
      icon: Truck,
      label: "Shipping",
      description: "Shipping and delivery management",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-white min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="space-y-1">
            <div className="h-6 bg-gray-100 rounded w-44" />
            <div className="h-4 bg-gray-100 rounded w-64" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">
          Overview of all franchises and their activities
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick Access modules */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {modules.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </div>

      {/* Recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentApplications />

        <Card className="bg-white border border-gray-400 shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Recent Orders
            </CardTitle>
            <Link
              href="/admin/orders"
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400">No recent orders</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-gray-900">
                        {order.franchise?.name ?? `Order #${order.id}`}
                      </p>
                      <p className="text-xs text-gray-400">{order.orderType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        ₹{Number(order.totalAmount).toLocaleString()}
                      </p>
                      <p
                        className={`text-xs ${
                          order.status === "Delivered"
                            ? "text-green-600"
                            : order.status === "Pending"
                            ? "text-orange-500"
                            : "text-blue-500"
                        }`}
                      >
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
