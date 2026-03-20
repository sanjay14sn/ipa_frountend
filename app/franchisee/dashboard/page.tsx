"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  GraduationCap,
  ShoppingCart,
  Award,
  Package,
  Building2,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/user-context";
import { RequestFranchiseModal } from "@/components/request-franchise-modal";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import {
  getFranchiseeDashboardStats,
  type FranchiseeDashboardStats,
} from "@/services/dashboard.service";
import { getFranchiseeOrders, type OrderData } from "@/services/order.service";

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

interface QuickLinkProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

function QuickLink({ href, icon: Icon, label, description }: QuickLinkProps) {
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

const EMPTY_STATS: FranchiseeDashboardStats = {
  students: { total: 0, active: 0 },
  courseInstructors: { total: 0, pending: 0 },
  orders: { total: 0, pending: 0 },
  certificates: { total: 0, pending: 0 },
};

export default function FranchiseeDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestProgramsModalOpen, setRequestProgramsModalOpen] =
    useState(false);
  const [stats, setStats] = useState<FranchiseeDashboardStats>(EMPTY_STATS);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "franchisee" && user?.franchiseStatus !== "Active") {
      router.push("/franchisee/agreement");
      return;
    }
  }, [router, user?.franchiseStatus]);

  useEffect(() => {
    if (!user?.franchiseId) return;
    fetchData();
  }, [user?.franchiseId]);

  const fetchData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getFranchiseeDashboardStats(),
        getFranchiseeOrders(),
      ]);
      setStats({
        students: { ...EMPTY_STATS.students, ...statsData?.students },
        courseInstructors: {
          ...EMPTY_STATS.courseInstructors,
          ...statsData?.courseInstructors,
        },
        orders: { ...EMPTY_STATS.orders, ...statsData?.orders },
        certificates: {
          ...EMPTY_STATS.certificates,
          ...statsData?.certificates,
        },
      });
      setRecentOrders((ordersData ?? []).slice(0, 5));
    } catch (error) {
      console.error("Error fetching franchisee dashboard data:", error);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.franchiseId) {
    return (
      <div className="p-6 bg-white min-h-screen animate-pulse space-y-4">
        <div className="h-6 bg-gray-100 rounded w-48" />
        <div className="h-4 bg-gray-100 rounded w-72" />
      </div>
    );
  }

  const statCards: StatCardProps[] = [
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

  const quickLinks: QuickLinkProps[] = [
    {
      href: "/franchisee/students",
      icon: Users,
      label: "Students",
      description: "View and manage students",
    },
    {
      href: "/franchisee/course-instructors",
      icon: GraduationCap,
      label: "Course Instructors",
      description: "Manage your instructors",
    },
    {
      href: "/franchisee/orders",
      icon: Package,
      label: "Orders",
      description: "Place or track orders",
    },
    {
      href: "/franchisee/certificate-requests",
      icon: Award,
      label: "Certificates",
      description: "Certificate requests",
    },
    {
      href: "/franchisee/contests",
      icon: Trophy,
      label: "Contests",
      description: "View available contests",
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {user.franchiseName ?? "Franchise Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">
            Overview of your franchise activities
          </p>
        </div>
        {user.franchiseStatus === "Active" && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestProgramsModalOpen(true)}
            >
              Request Programs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestModalOpen(true)}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Request New Franchise
            </Button>
          </div>
        )}
      </div>

      <RequestFranchiseModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />
      <RequestProgramsModal
        open={requestProgramsModalOpen}
        onOpenChange={setRequestProgramsModalOpen}
      />

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* Quick Access */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
          Quick Access
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {quickLinks.map((l) => (
            <QuickLink key={l.href} {...l} />
          ))}
        </div>
      </div>

      {/* Profile + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile card */}
        {user.profile && (
          <Card className="bg-white border border-gray-400 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Name", user.profile.name],
                  ["Phone", user.profile.phone],
                  ["Email", user.profile.mail],
                  ["City", user.profile.city],
                  ["Franchise", user.profile.franchise?.name],
                  ["Type", user.profile.franchise?.type],
                  [
                    "Status",
                    user.profile.franchise?.status,
                  ],
                  user.profile.franchise?.approvedAt
                    ? [
                        "Approved",
                        new Date(
                          user.profile.franchise.approvedAt
                        ).toLocaleDateString(),
                      ]
                    : null,
                ]
                  .filter(Boolean)
                  .map(([label, value]) => (
                    <div key={label} className="flex justify-between col-span-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="font-medium text-gray-900 text-right">
                        {value ?? "—"}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Payroll summary */}
              {(user.profile.franchise?.franchisePayrolls?.length > 0 ||
                user.profile.franchise?.franchisePayroll) && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                    Payroll
                  </p>
                  {(
                    user.profile.franchise?.franchisePayrolls ?? [
                      user.profile.franchise?.franchisePayroll,
                    ]
                  )
                    .filter(Boolean)
                    .map((p: any, i: number) => (
                      <div key={i} className={i > 0 ? "mt-3 pt-3 border-t" : ""}>
                        {p?.franchiseProgram?.program?.name && (
                          <p className="text-xs text-gray-500 mb-1">
                            {p.franchiseProgram.program.name}
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                          {[
                            ["Fee", p?.franchiseFee],
                            ["Monthly", p?.monthlyFee],
                            ["Royalty", p?.royalty],
                          ].map(([label, val]) => (
                            <div key={label as string}>
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="font-medium text-gray-900">
                                ₹{Number(val ?? 0).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card className="bg-white border border-gray-400 shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Recent Orders
            </CardTitle>
            <Link
              href="/franchisee/orders"
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
                      <p className="text-sm text-gray-900">{order.orderType}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
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
