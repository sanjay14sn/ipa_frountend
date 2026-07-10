"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { LastUpdated, PageHeaderCard, StatCell } from "@/components/shared";
import { formatDate } from "@/lib/date-utils";
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
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { RequestFranchiseModal } from "@/components/request-franchise-modal";
import { RequestProgramsModal } from "@/components/request-programs-modal";
import { type FranchiseeDashboardStats } from "@/services/dashboard.service";
import { type OrderData } from "@/services/order.service";
import { useFranchiseeDashboardStats } from "@/hooks/api/dashboard.hooks";
import { useAgreementMine, useAgreementsMine } from "@/hooks/api/agreement.hooks";
import { useFranchiseeOrders } from "@/hooks/api/order.hooks";
import { cn } from "@/lib/utils";
import { isFranchiseOperational } from "@/lib/auth";
import { formatRupees } from "@/lib/currency-utils";
import type {
  AgreementLinkedPayment,
  AgreementRecord,
  ReceivableCompactSummary,
  ReceivableFranchiseeSummary,
  ReceivableInstallmentSummary,
} from "@/services/agreement.service";

/**
 * FR-01: stat cells carry NO trend props — R4 bans trend arrows and percent
 * badges. Attention travels through chips instead (FR-02/FR-03).
 */
interface StatCellConfig {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  pendingChip?: { count: number; href: string };
  alertChip?: { label: string; href?: string };
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

const COMPLETED_PAYMENT_STATUSES = new Set(["completed", "paid", "captured"]);

function isFranchiseFeePayment(payment: AgreementLinkedPayment): boolean {
  const type = (payment.type ?? "").toUpperCase().replace(/-/g, "_");
  return type === "FRANCHISE_FEE";
}

function isCompletedPayment(payment: AgreementLinkedPayment): boolean {
  return COMPLETED_PAYMENT_STATUSES.has((payment.status ?? "").toLowerCase());
}

function sumFranchiseFeePaid(
  payments: AgreementLinkedPayment[] | null | undefined,
): number {
  return (payments ?? [])
    .filter((payment) => isFranchiseFeePayment(payment) && isCompletedPayment(payment))
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
}

function resolveUpcomingDue(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
) {
  if (!summary) return { amount: null as number | null, dueAt: null as string | null };

  if (isFullInstallmentSummary(summary)) {
    const nextDue = summary.nextDueItem;
    return {
      amount: nextDue?.payableAmount ?? nextDue?.amount ?? null,
      dueAt: nextDue?.dueAt ?? null,
    };
  }

  if ("nextDueItem" in summary && summary.nextDueItem) {
    return {
      amount:
        summary.nextDueItem.payableAmount ?? summary.nextDueItem.amount ?? null,
      dueAt: summary.nextDueItem.dueAt ?? null,
    };
  }

  return {
    amount: summary.nextDueAmount ?? null,
    dueAt: summary.nextDueAt ?? null,
  };
}

function resolveFranchiseFeePaidFromSummary(
  summary:
    | ReceivableInstallmentSummary
    | ReceivableFranchiseeSummary
    | ReceivableCompactSummary
    | null
    | undefined,
): number {
  if (!summary) return 0;
  if (isFullInstallmentSummary(summary)) {
    return (
      summary.totals.payablePaidAmount ??
      summary.totals.paidAmount ??
      0
    );
  }
  return summary.payablePaidAmount ?? summary.paidAmount ?? 0;
}

function buildFranchiseFeeCardDisplay({
  paidAmount,
  upcomingAmount,
  upcomingDueAt,
  hasSchedule,
}: {
  paidAmount: number;
  upcomingAmount: number | null;
  upcomingDueAt: string | null;
  hasSchedule: boolean;
}): Pick<StatCellConfig, "value" | "sub"> {
  const hasUpcoming = upcomingAmount != null && upcomingAmount > 0;
  const upcomingLabel = hasUpcoming
    ? `Next ${formatRupees(upcomingAmount)}${
        upcomingDueAt ? ` due ${formatDate(upcomingDueAt)}` : ""
      }`
    : undefined;

  if (paidAmount > 0) {
    return {
      value: formatRupees(paidAmount),
      sub: hasUpcoming ? upcomingLabel : undefined,
    };
  }

  if (hasUpcoming) {
    return {
      value: formatRupees(upcomingAmount!),
      sub: upcomingDueAt ? `Due ${formatDate(upcomingDueAt)}` : undefined,
    };
  }

  if (!hasSchedule) {
    return { value: "-", sub: "No franchise fee schedule" };
  }

  return { value: formatRupees(paidAmount), sub: undefined };
}

/**
 * FR-05: prime dashboard space belongs to work, not identity — the profile
 * card moved to /franchisee/profile; this panel surfaces every non-zero
 * pending item as a deep link (targets mirror the stat-cell chips).
 */
function PendingActionsCard({
  items,
}: {
  items: { label: string; count: number; href: string }[];
}) {
  const actionable = items.filter((item) => item.count > 0);
  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
        <CardTitle className="flex items-center gap-3 text-xl font-normal text-card-foreground">
          <ModulePill label="Actions" />
          Pending actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2 sm:p-5 sm:pt-2">
        {actionable.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          actionable.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent"
            >
              <span className="text-sm font-medium text-card-foreground">
                {item.label}
              </span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warning-soft px-2 text-xs font-medium text-warning-soft-foreground">
                {item.count}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function OrderRow({ order }: { order: import("@/services/order.service").OrderData }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-accent">
      <div>
        <p className="text-sm font-medium text-card-foreground">{order.orderType}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(order.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-card-foreground">
          {formatRupees(Number(order.totalAmount))}
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            order.status === "Delivered" && "text-emerald-600",
            order.status === "Pending" && "text-amber-600",
            order.status !== "Delivered" && order.status !== "Pending" && "text-sky-600",
          )}
        >
          {order.status}
        </p>
      </div>
    </div>
  );
}

function RecentOrdersCard({ orders }: { orders: import("@/services/order.service").OrderData[] }) {
  return (
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
        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No recent orders.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const isOperational = isFranchiseOperational(user);
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
  const emiAgreementQuery = useAgreementMine(emiAgreement?.id);
  const emiSummary =
    emiAgreementQuery.data?.receivables?.installmentSummary ??
    emiAgreement?.receivables?.installmentSummary ??
    null;
  const franchiseFeePaid = useMemo(() => {
    const payments = emiAgreementQuery.data?.payments;
    if (payments != null) {
      return sumFranchiseFeePaid(payments);
    }
    return resolveFranchiseFeePaidFromSummary(emiSummary);
  }, [emiAgreementQuery.data?.payments, emiSummary]);
  const upcomingDue = useMemo(() => resolveUpcomingDue(emiSummary), [emiSummary]);
  const franchiseFeeCard = useMemo(
    () =>
      buildFranchiseFeeCardDisplay({
        paidAmount: franchiseFeePaid,
        upcomingAmount: upcomingDue.amount,
        upcomingDueAt: upcomingDue.dueAt,
        hasSchedule: Boolean(emiAgreement),
      }),
    [franchiseFeePaid, upcomingDue, emiAgreement],
  );
  const emiOverdue = isFullInstallmentSummary(emiSummary)
    ? (emiSummary.totals.payableOverdueAmount ??
        emiSummary.totals.overdueAmount)
    : (emiSummary?.overdueAmount ?? 0);

  const loading = canFetch && (statsQuery.isLoading || ordersQuery.isLoading);

  // FR-04 (R5): freshness + manual refetch across the dashboard queries.
  const handleRefresh = () => {
    void statsQuery.refetch();
    void ordersQuery.revalidate();
    void agreementsQuery.refetch();
    void emiAgreementQuery.refetch();
  };

  useEffect(() => {
    if (user?.role === "franchisee" && !isOperational) {
      router.push("/franchisee/agreement");
      return;
    }
  }, [isOperational, router, user?.role]);

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

  const statCards: StatCellConfig[] = [
    {
      // FR-03: overdue EMIs show a red "Overdue" chip deep-linking to the
      // agreements tab — never the old fake 100%-down trend.
      label: "Franchise Fee Paid",
      value: franchiseFeeCard.value,
      sub: franchiseFeeCard.sub,
      icon: IndianRupee,
      alertChip:
        emiOverdue > 0
          ? { label: "Overdue", href: "/franchisee/franchise?tab=agreements" }
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
    },
    {
      label: "Course Instructors",
      value: stats.courseInstructors.total.toString(),
      icon: GraduationCap,
      pendingChip: {
        count: stats.courseInstructors.pending,
        href: "/franchisee/course-instructors",
      },
    },
    {
      label: "Total Orders",
      value: stats.orders.total.toString(),
      icon: ShoppingCart,
      pendingChip: {
        count: stats.orders.pending,
        href: "/franchisee/orders",
      },
    },
    {
      label: "Certificates",
      value: stats.certificates.total.toString(),
      icon: Award,
      pendingChip: {
        count: stats.certificates.pending,
        href: "/franchisee/students?tab=certificates",
      },
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
        <PageHeaderCard
          embedded
          className="border-b py-5"
          eyebrow={<ModulePill label="Franchise" />}
          title={user.franchiseName ?? "Franchise Dashboard"}
          description="Overview of your franchise activities."
          actions={
            <>
              <LastUpdated
                updatedAt={statsQuery.dataUpdatedAt}
                onRefresh={handleRefresh}
                isRefreshing={statsQuery.isFetching}
              />
              {isOperational ? (
                <>
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
                </>
              ) : null}
            </>
          }
        />

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
              <StatCell key={s.label} {...s} />
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
        <PendingActionsCard
          items={[
            {
              label: "Course instructor approvals",
              count: stats.courseInstructors.pending,
              href: "/franchisee/course-instructors",
            },
            {
              label: "Pending orders",
              count: stats.orders.pending,
              href: "/franchisee/orders",
            },
            {
              label: "Certificate requests",
              count: stats.certificates.pending,
              href: "/franchisee/students?tab=certificates",
            },
            {
              label: "Overdue EMI",
              count: emiOverdue > 0 ? 1 : 0,
              href: "/franchisee/franchise?tab=agreements",
            },
          ]}
        />
        <RecentOrdersCard orders={recentOrders} />
      </div>
    </div>
  );
}
