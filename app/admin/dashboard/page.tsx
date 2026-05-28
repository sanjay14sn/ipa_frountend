"use client";

import { useMemo, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  ClipboardSignature,
  CreditCard,
  Layers,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboardStats } from "@/hooks/api/dashboard.hooks";
import { usePendingFranchiseApplications } from "@/hooks/api/franchisee.hooks";
import { useAdminOrderRows } from "@/hooks/api/order.hooks";
import { type DashboardStats } from "@/services/dashboard.service";
import { type FranchiseData } from "@/services/franchisee.service";
import { type OrderData } from "@/services/order.service";
import { useUser } from "@/context/user-context";
import { cn } from "@/lib/utils";

type SummaryItem = {
  label: string;
  value: number;
  description: string;
};

type QuickAccessItem = {
  href: string;
  icon: ElementType;
  label: string;
  description: string;
  count?: number;
};

type PanelConfig = {
  label: string;
  title: string;
  href: string;
  viewLabel?: string;
  children: ReactNode;
};

const EMPTY_STATS: DashboardStats = {
  franchises: { total: 0, pending: 0, active: 0 },
  students: { total: 0, pending: 0, active: 0 },
  courseInstructors: { total: 0, pending: 0, active: 0 },
  orders: { total: 0, pending: 0, active: 0 },
  certificates: { total: 0, pending: 0, active: 0 },
};

function formatLastUpdated(updatedAt?: number) {
  if (!updatedAt) return "just now";

  const diffMs = Date.now() - updatedAt;
  if (!Number.isFinite(diffMs) || diffMs < 60_000) return "just now";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatOrderId(order: OrderData) {
  return order.referenceId || `ORD-${String(order.id).padStart(4, "0")}`;
}

function formatApplicationSubtitle(application: FranchiseData) {
  const owner = application.franchisee?.name;
  const location = [application.city, application.state].filter(Boolean).join(", ");
  return [owner, location].filter(Boolean).join(" - ") || "Franchise application";
}

function formatOrderSubtitle(order: OrderData) {
  const franchise = order.franchise?.name;
  const status = order.adminStatus ?? order.status;
  return [franchise, status].filter(Boolean).join(" - ") || "Order activity";
}

function SummaryCell({ item }: { item: SummaryItem }) {
  return (
    <div className="space-y-2 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{item.label}</div>
        <span className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <div className="text-4xl font-normal leading-none text-card-foreground">
        {item.value}
      </div>
      <div className="max-w-44 text-xs leading-snug text-muted-foreground">
        {item.description}
      </div>
    </div>
  );
}

function ModulePill({ label }: { label: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
    >
      {label}
    </Badge>
  );
}

function QuickAccessCard({
  item,
  compact = false,
}: {
  item: QuickAccessItem;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent",
        compact && "min-h-[4.75rem]",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-medium text-card-foreground">{item.label}</div>
        <div className="truncate text-xs text-muted-foreground">
          {item.description}
        </div>
      </div>
      {typeof item.count === "number" && (
        <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border bg-muted/30 px-2 text-xs text-card-foreground">
          {item.count}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ApplicationCard({ application }: { application: FranchiseData }) {
  return (
    <Link
      href={`/admin/franchise?tab=applications`}
      className="block rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-card-foreground">
            {application.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatApplicationSubtitle(application)}
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
        >
          {application.status}
        </Badge>
      </div>
    </Link>
  );
}

function OrderCard({ order }: { order: OrderData }) {
  return (
    <Link
      href={`/admin/operations?tab=orders`}
      className="block rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-medium text-card-foreground">
            {formatOrderId(order)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatOrderSubtitle(order)}
          </div>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
        >
          {order.totalItems ?? 0} items
        </Badge>
      </div>
    </Link>
  );
}

function DashboardPanel({ label, title, href, viewLabel = "View all", children }: PanelConfig) {
  return (
    <section className="flex h-full flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <ModulePill label={label} />
          <h3 className="text-xl text-card-foreground">{title}</h3>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {viewLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="border-t" />
      {children}
    </section>
  );
}

function LoadingDashboard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b px-5 py-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading admin dashboard...
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useUser();
  const isSuperAdmin = user?.role === "admin" && user.adminRole === "super";
  const statsQuery = useAdminDashboardStats();
  const applicationsQuery = usePendingFranchiseApplications({
    page: 1,
    limit: 5,
  });
  const ordersQuery = useAdminOrderRows({ page: 1, limit: 5 });

  const stats: DashboardStats = useMemo(
    () => ({
      franchises: {
        ...EMPTY_STATS.franchises,
        ...statsQuery.data?.franchises,
      },
      students: { ...EMPTY_STATS.students, ...statsQuery.data?.students },
      courseInstructors: {
        ...EMPTY_STATS.courseInstructors,
        ...statsQuery.data?.courseInstructors,
      },
      orders: { ...EMPTY_STATS.orders, ...statsQuery.data?.orders },
      certificates: {
        ...EMPTY_STATS.certificates,
        ...statsQuery.data?.certificates,
      },
    }),
    [statsQuery.data],
  );

  const recentApplications = useMemo(
    () => (applicationsQuery.data ?? []).slice(0, 3),
    [applicationsQuery.data],
  );

  const recentOrders = useMemo(
    () => (ordersQuery.data?.rows ?? []).slice(0, 3),
    [ordersQuery.data],
  );

  const summary: SummaryItem[] = [
    {
      label: "Total Franchises",
      value: stats.franchises.total,
      description: "Active networks",
    },
    {
      label: "Total Students",
      value: stats.students.total,
      description: isSuperAdmin
        ? "Enrolled across all franchises"
        : "Enrolled in your assigned franchises",
    },
    {
      label: "Course Instructors",
      value: stats.courseInstructors.total,
      description: isSuperAdmin
        ? "Active across all regions"
        : "Within your assigned franchises",
    },
    {
      label: "Total Orders",
      value: stats.orders.total,
      description: isSuperAdmin ? "All time" : "For your assigned franchises",
    },
    {
      label: "Certificates",
      value: stats.certificates.total,
      description: isSuperAdmin ? "Issued to date" : "Issued in your region",
    },
  ];

  const franchiseQuickAccess: QuickAccessItem[] = [
    {
      href: "/admin/franchise?tab=franchises",
      icon: Building2,
      label: "Franchises",
      description: "View and manage all",
      count: stats.franchises.total,
    },
    {
      href: "/admin/franchise?tab=applications",
      icon: Users,
      label: "Pending Approvals",
      description: "Franchise applications",
      count: stats.franchises.pending,
    },
    {
      href: "/admin/franchise?tab=agreements",
      icon: ClipboardSignature,
      label: "Agreements",
      description: "Signatures and payments",
    },
  ];

  const trainingQuickAccess: QuickAccessItem[] = [
    {
      href: "/admin/course-instructors?tab=applications",
      icon: UserCheck,
      label: "CI Approvals",
      description: "Instructor applications",
      count: stats.courseInstructors.pending,
    },
    {
      href: "/admin/course-instructors?tab=training",
      icon: BookOpen,
      label: "CI Training",
      description: "Manage sessions",
    },
    {
      href: "/admin/course-instructors?tab=levels",
      icon: Layers,
      label: "Training Levels",
      description: "Configure level settings",
    },
  ];

  if (isSuperAdmin) {
    trainingQuickAccess.push({
      href: "/admin/franchise?tab=programs",
      icon: ClipboardList,
      label: "Program Requests",
      description: "Approve new programs",
    });
  }

  const ordersQuickAccess: QuickAccessItem[] = [
    {
      href: "/admin/operations?tab=orders",
      icon: ShoppingCart,
      label: "Orders",
      description: "View and manage all",
      count: stats.orders.total,
    },
    {
      href: "/admin/operations?tab=payments",
      icon: CreditCard,
      label: "Payments",
      description: "Records and billing",
    },
    {
      href: "/admin/operations?tab=shipping",
      icon: Truck,
      label: "Shipping",
      description: "Delivery management",
    },
  ];

  const operationsQuickAccess: QuickAccessItem[] = [
    {
      href: "/admin/students?tab=certificates",
      icon: Award,
      label: "Certificates",
      description: "Certificate requests",
      count: stats.certificates.pending,
    },
    {
      href: "/admin/students?tab=ids",
      icon: BadgeCheck,
      label: "ID Requests",
      description: "Student ID card requests",
      count: 0,
    },
    {
      href: "/admin/operations?tab=inventory",
      icon: Package,
      label: "Inventory",
      description: "Suppliers and procurement",
    },
  ];

  if (statsQuery.isLoading && !statsQuery.data) {
    return <LoadingDashboard />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b px-4 py-5 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl text-card-foreground">Admin Dashboard</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Overview of all franchises and platform activity."
              : "Overview of your assigned franchises and regional activity."}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Last updated: {formatLastUpdated(statsQuery.dataUpdatedAt)}
        </div>
      </div>

      <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        {summary.map((item) => (
          <SummaryCell key={item.label} item={item} />
        ))}
      </div>

      <div className="grid xl:grid-cols-3">
        <div className="border-b xl:border-r">
          <DashboardPanel
            label="Franchises"
            title="Quick access"
            href="/admin/franchise?tab=franchises"
          >
            <div className="space-y-3">
              {franchiseQuickAccess.map((item) => (
                <QuickAccessCard key={item.label} item={item} compact />
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="border-b xl:border-r">
          <DashboardPanel
            label="Training"
            title="Quick access"
            href="/admin/course-instructors"
          >
            <div className="space-y-3">
              {trainingQuickAccess.map((item) => (
                <QuickAccessCard key={item.label} item={item} compact />
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="border-b">
          <DashboardPanel
            label="Orders & Payments"
            title="Quick access"
            href="/admin/operations?tab=orders"
          >
            <div className="space-y-3">
              {ordersQuickAccess.map((item) => (
                <QuickAccessCard key={item.label} item={item} compact />
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="border-b xl:border-b-0 xl:border-r">
          <DashboardPanel
            label="Franchises"
            title="Recent applications"
            href="/admin/franchise?tab=applications"
            viewLabel="See all"
          >
            {applicationsQuery.isLoading && !applicationsQuery.data ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading applications...
              </div>
            ) : recentApplications.length === 0 ? (
              <EmptyPanel message="No pending applications." />
            ) : (
              <div className="space-y-3">
                {recentApplications.map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                  />
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>

        <div className="border-b xl:border-b-0 xl:border-r">
          <DashboardPanel
            label="Orders"
            title="Recent orders"
            href="/admin/operations?tab=orders"
          >
            {ordersQuery.isLoading && !ordersQuery.data ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <EmptyPanel message="No recent orders." />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>

        <div>
          <DashboardPanel
            label="Operations"
            title="Quick access"
            href="/admin/operations?tab=monitoring"
          >
            <div className="space-y-3">
              {operationsQuickAccess.map((item) => (
                <QuickAccessCard key={item.label} item={item} compact />
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
