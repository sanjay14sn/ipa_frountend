"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Award,
  Building2,
  ChevronRight,
  GraduationCap,
  IndianRupee,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { RequestFranchiseModal } from "@/components/request-franchise-modal";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import { type FranchiseeDashboardStats } from "@/services/dashboard.service";
import { type OrderData } from "@/services/order.service";
import { useFranchiseeDashboardStats } from "@/hooks/api/dashboard.hooks";
import { useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { useFranchiseeOrders } from "@/hooks/api/order.hooks";
import { cn } from "@/lib/utils";
import { getEffectiveFranchiseStatus } from "@/lib/auth";
import type {
  AgreementRecord,
  ReceivableCompactSummary,
  ReceivableFranchiseeSummary,
  ReceivableInstallmentSummary,
} from "@/services/agreement.service";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: ElementType;
  trend?: { value: number; up: boolean };
  href?: string;
}

function StatCard({ label, value, sub, icon: Icon, trend, href }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.up ? "text-emerald-600" : "text-amber-600",
            )}
          >
            {trend.up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}%
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-4xl font-light leading-none text-card-foreground">
          {value}
        </p>
        {sub ? (
          <p className="mt-1 max-w-44 text-xs leading-snug text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block space-y-2 px-4 py-4 transition-colors hover:bg-accent sm:px-5"
        aria-label={`${label}: open EMI payment details`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="space-y-2 px-4 py-4 sm:px-5">
      {content}
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  icon: ElementType;
  label: string;
  description: string;
}

function QuickLink({ href, icon: Icon, label, description }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[4.75rem] items-center gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-card-foreground">
          {label}
        </p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </Link>
  );
}

function ModulePill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
      {label}
    </span>
  );
}

function DashboardPanel({
  label,
  title,
  href,
  children,
}: {
  label: string;
  title: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <ModulePill label={label} />
          <h2 className="text-xl text-card-foreground">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <div className="border-t" />
      {children}
    </section>
  );
}

function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function shortDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isFullInstallmentSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): summary is ReceivableInstallmentSummary {
  return Boolean(summary && "items" in summary && Array.isArray(summary.items));
}

function resolveEmiAgreement(agreements: AgreementRecord[]) {
  return agreements
    .filter(
      (agreement) =>
        agreement.type === "NEW_FRANCHISE" &&
        Boolean(agreement.receivables?.installmentSummary),
    )
    .sort((left, right) => right.id - left.id)[0];
}

const EMPTY_STATS: FranchiseeDashboardStats = {
  students: { total: 0, active: 0, pending: 0 },
  courseInstructors: { total: 0, active: 0, pending: 0 },
  orders: { total: 0, active: 0, pending: 0 },
  certificates: { total: 0, active: 0, pending: 0 },
};

export default function FranchiseeDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestProgramsModalOpen, setRequestProgramsModalOpen] =
    useState(false);
  const franchiseStatus = getEffectiveFranchiseStatus(user);
  const canFetch = !!user?.franchiseId;
  const statsQuery = useFranchiseeDashboardStats(canFetch);
  const ordersQuery = useFranchiseeOrders(undefined, canFetch);
  const agreementsQuery = useAgreementsMine(user?.franchiseId, undefined);

  const stats: FranchiseeDashboardStats = useMemo(
    () => ({
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

  const recentOrders: OrderData[] = useMemo(
    () => (ordersQuery.orders ?? []).slice(0, 5),
    [ordersQuery.orders],
  );
  const emiAgreement = useMemo(
    () => resolveEmiAgreement(agreementsQuery.data ?? []),
    [agreementsQuery.data],
  );
  const emiSummary = emiAgreement?.receivables?.installmentSummary ?? null;
  const emiOutstanding = isFullInstallmentSummary(emiSummary)
    ? emiSummary.totals.outstandingAmount
    : (emiSummary?.outstandingAmount ?? 0);
  const emiNextAmount = isFullInstallmentSummary(emiSummary)
    ? emiSummary.nextDueItem?.amount
    : emiSummary?.nextDueAmount;
  const emiNextDate = isFullInstallmentSummary(emiSummary)
    ? emiSummary.nextDueItem?.dueAt
    : emiSummary?.nextDueAt;
  const emiOverdue = isFullInstallmentSummary(emiSummary)
    ? emiSummary.totals.overdueAmount
    : (emiSummary?.overdueAmount ?? 0);

  const loading = canFetch && (statsQuery.isLoading || ordersQuery.isLoading);

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  useEffect(() => {
    if (user?.role === "franchisee" && franchiseStatus !== "Active") {
      router.push("/franchisee/agreement");
      return;
    }
  }, [franchiseStatus, router, user?.role]);

  if (!user || !user.franchiseId) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
        </div>
      </div>
    );
  }

  const statCards: StatCardProps[] = [
    {
      label: "EMI Pending",
      value: emiSummary ? money(emiOutstanding) : "-",
      sub: emiSummary
        ? `Next ${emiNextAmount != null ? money(emiNextAmount) : "-"}${
            emiNextDate ? ` due ${shortDate(emiNextDate)}` : ""
          }`
        : "No active EMI",
      icon: IndianRupee,
      href: emiAgreement ? "/franchisee/franchise?tab=agreements" : undefined,
      trend:
        emiOverdue > 0
          ? {
              value: 100,
              up: false,
            }
          : undefined,
    },
    {
      label: "Total Students",
      value: stats.students.total.toString(),
      sub:
        stats.students.active > 0
          ? `${stats.students.active} active`
          : undefined,
      icon: Users,
      trend:
        stats.students.active > 0
          ? {
              value: pct(stats.students.active, stats.students.total),
              up: true,
            }
          : undefined,
    },
    {
      label: "Course Instructors",
      value: stats.courseInstructors.total.toString(),
      sub:
        stats.courseInstructors.pending > 0
          ? `${stats.courseInstructors.pending} pending`
          : undefined,
      icon: GraduationCap,
      trend:
        stats.courseInstructors.pending > 0
          ? {
              value: pct(
                stats.courseInstructors.pending,
                stats.courseInstructors.total,
              ),
              up: false,
            }
          : undefined,
    },
    {
      label: "Total Orders",
      value: stats.orders.total.toString(),
      sub:
        stats.orders.pending > 0
          ? `${stats.orders.pending} pending`
          : undefined,
      icon: ShoppingCart,
      trend:
        stats.orders.pending > 0
          ? {
              value: pct(stats.orders.pending, stats.orders.total),
              up: false,
            }
          : undefined,
    },
    {
      label: "Certificates",
      value: stats.certificates.total.toString(),
      sub:
        stats.certificates.pending > 0
          ? `${stats.certificates.pending} pending`
          : undefined,
      icon: Award,
      trend:
        stats.certificates.pending > 0
          ? {
              value: pct(
                stats.certificates.pending,
                stats.certificates.total,
              ),
              up: false,
            }
          : undefined,
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
      href: "/franchisee/students?tab=certificates",
      icon: Award,
      label: "Certificates",
      description: "Certificate requests",
    },
    {
      href: "/franchisee/students?tab=contests",
      icon: Trophy,
      label: "Contests",
      description: "View available contests",
    },
  ];

  return (
    <div className="space-y-4">
      <RequestFranchiseModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
      />
      <RequestProgramsModal
        open={requestProgramsModalOpen}
        onOpenChange={setRequestProgramsModalOpen}
      />

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-5 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2">
              <ModulePill label="Franchise" />
            </div>
            <h1 className="text-2xl text-card-foreground">
              {user.franchiseName ?? "Franchise Dashboard"}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
              Overview of your franchise activities.
            </p>
          </div>
          {franchiseStatus === "Active" && (
            <div className="flex shrink-0 flex-wrap gap-2">
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
                <Building2 className="h-4 w-4" />
                Request New Franchise
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3 px-4 py-4 sm:px-5">
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid divide-y border-b md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        )}

        <DashboardPanel label="Tools" title="Quick access">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickLinks.map((l) => (
              <QuickLink key={l.href} {...l} />
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {user.profile && (
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
              <CardTitle className="flex items-center gap-3 text-xl font-normal text-card-foreground">
                <ModulePill label="Profile" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-2 sm:p-5 sm:pt-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {(
                  [
                    ["Name", user.profile.name],
                    ["Phone", user.profile.phone],
                    ["Email", user.profile.mail],
                    ["City", user.profile.city],
                    ["Franchise", user.profile.franchise?.name],
                    ["Type", user.profile.franchise?.type],
                    ["Status", user.profile.franchise?.status],
                    user.profile.franchise?.approvedAt
                      ? [
                          "Approved",
                          new Date(
                            user.profile.franchise.approvedAt,
                          ).toLocaleDateString(),
                        ]
                      : null,
                  ] as ([string, string | undefined] | null)[]
                )
                  .filter(
                    (row): row is [string, string | undefined] => row != null,
                  )
                  .map(([label, value]) => (
                    <div
                      key={label}
                      className="col-span-1 flex justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-right font-medium text-card-foreground">
                        {value ?? "-"}
                      </span>
                    </div>
                  ))}
              </div>

              {user.profile.franchise?.franchisePayroll && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                    Payroll
                  </p>
                  {[user.profile.franchise.franchisePayroll]
                    .filter(Boolean)
                    .map((p: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-xl border bg-accent/30 p-3",
                          i > 0 && "mt-3",
                        )}
                      >
                        {p?.franchiseProgram?.program?.name && (
                          <p className="mb-2 text-xs text-muted-foreground">
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
                              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                {label}
                              </p>
                              <p className="font-medium text-card-foreground">
                                {"\u20B9"}
                                {Number(val ?? 0).toLocaleString()}
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

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="flex items-center gap-3 text-xl font-normal text-card-foreground">
              <ModulePill label="Orders" />
              Recent orders
            </CardTitle>
            <Link
              href="/franchisee/orders"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
            {recentOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No recent orders.
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {order.orderType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">
                        {"\u20B9"}
                        {Number(order.totalAmount).toLocaleString()}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          order.status === "Delivered" && "text-emerald-600",
                          order.status === "Pending" && "text-amber-600",
                          order.status !== "Delivered" &&
                            order.status !== "Pending" &&
                            "text-sky-600",
                        )}
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
