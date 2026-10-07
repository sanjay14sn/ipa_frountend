"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Pencil,
  Receipt,
  Settings2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  DataTable,
  StatusBadge,
  SummaryStatCard,
  SummaryStatGrid,
  TableErrorState,
  TableLoadingState,
  TableMainCell,
  RowActionButton,
  TablePageShell,
  TableSectionSurface,
  type DataTableColumn,
} from "@/components/shared";
import { EditFeeInstallmentDialog } from "./edit-fee-installment-dialog";
import { ConfirmDialog } from "@/components/shared/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupees } from "@/lib/currency-utils";
import { formatDate } from "@/lib/date-utils";
import { extractErrorMessage } from "@/lib/error-utils";
import {
  formatFeeCollectionSummary,
  formatFeeHistoryRowTitle,
  formatStudentFeePaidOn,
  isRegistrationFeeRow,
} from "@/lib/student-fee-history-display";
import { computeStudentFeeHistoryTotals } from "@/lib/student-fee-history-totals";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/hooks/api/query-keys";
import {
  fetchStudentFeeHistory,
  markStudentFeeAsPaid,
  type StudentFeeHistoryRow,
} from "@/services/student-fee.service";
import { getFeeRuleLabel } from "../../_components/fee-rule-label";

const STATUS_LABEL: Record<StudentFeeHistoryRow["status"], string> = {
  PAID: "Paid",
  UPCOMING: "Upcoming",
  OVERDUE: "Overdue",
  SCHEDULED: "Scheduled",
};

function isOpenInstallment(row: StudentFeeHistoryRow): boolean {
  return row.status === "UPCOMING" || row.status === "OVERDUE";
}

function canEditInstallmentRow(row: StudentFeeHistoryRow): boolean {
  return row.status === "PAID" || isOpenInstallment(row);
}

export function StudentFeeHistoryView({ studentId }: { studentId: number }) {
  const queryClient = useQueryClient();
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [editingRow, setEditingRow] = useState<StudentFeeHistoryRow | null>(
    null,
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["student-fee-history", studentId],
    queryFn: () => fetchStudentFeeHistory(studentId),
  });

  const totals = useMemo(() => {
    if (!data?.configured || !data.summary) return null;
    return computeStudentFeeHistoryTotals(data.rows, data.summary.planTotal);
  }, [data]);

  const hasOpenDues = Boolean(
    data?.summary?.nextDueDate &&
      data.summary.nextDueAmount != null &&
      data.summary.nextDueAmount > 0,
  );

  const openRow = useMemo(
    () => data?.rows.find(isOpenInstallment) ?? null,
    [data?.rows],
  );

  const handleMarkAsPaid = async () => {
    try {
      setIsPaying(true);
      await markStudentFeeAsPaid(studentId);
      toast.success("Installment recorded as paid.");
      setConfirmPayOpen(false);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.students.feeSummaries,
        }),
        queryClient.invalidateQueries({ queryKey: ["student-fee-history"] }),
      ]);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to record payment."));
    } finally {
      setIsPaying(false);
    }
  };

  const columns: DataTableColumn<StudentFeeHistoryRow>[] = useMemo(
    () => [
      {
        key: "installment",
        header: "Fee item",
      },
      {
        key: "dueAmount",
        header: "Due amount",
        className: "text-right font-semibold tabular-nums",
        render: (row) => formatRupees(row.amount),
      },
      {
        key: "dueDate",
        header: "Due Date",
        render: (row) => (row.dueDate ? formatDate(row.dueDate) : "—"),
      },
      {
        key: "paidAt",
        header: "Paid On",
        render: (row) => formatStudentFeePaidOn(row),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <StatusBadge label={STATUS_LABEL[row.status] ?? row.status} />
        ),
      },
      {
        key: "edit",
        header: "",
        className: "w-12 text-right",
        render: (row) =>
          canEditInstallmentRow(row) ? (
            <RowActionButton
              icon={Pencil}
              label={
                isRegistrationFeeRow(row)
                  ? "Edit registration fee"
                  : "Edit installment"
              }
              onClick={(e) => {
                e.stopPropagation();
                setEditingRow(row);
              }}
            />
          ) : null,
      },
    ],
    [],
  );

  const handleInstallmentSaved = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.feeSummaries,
      }),
    ]);
  };

  const student = data?.student;
  const summary = data?.summary;

  return (
    <>
      <TablePageShell
        title={student ? `${student.name} — Fee History` : "Fee History"}
        description={
          student && summary
            ? `Roll ${student.rollNo} · ${getFeeRuleLabel(summary.feeRule)} · ${formatDate(summary.startDate)} – ${formatDate(summary.endDate)}`
            : "Installment schedule and payments for this student."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data?.configured ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/franchisee/fees?studentId=${studentId}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit fee plan
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/franchisee/fee-dues">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Fee Dues
              </Link>
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <TableLoadingState message="Loading fee history…" />
        ) : error ? (
          <TableErrorState
            message="Couldn't load fee history"
            onRetry={() => refetch()}
          />
        ) : !data?.configured ? (
          <div className="rounded-xl border border-border/80 bg-muted/20 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Settings2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Fee setup not configured
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {student
                ? `Set fee rules, amounts, and course duration for ${student.name} before tracking dues and payments.`
                : "Set fee rules, amounts, and course duration before tracking dues and payments."}
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/franchisee/fees?studentId=${studentId}`}>
                <Settings2 className="mr-2 h-4 w-4" />
                Configure fees
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {totals && summary ? (
              <>
                <SummaryStatGrid className="lg:grid-cols-4">
                  <SummaryStatCard
                    label="Plan total"
                    value={formatRupees(totals.planTotal)}
                    description="Registration + course fee"
                  />
                  <SummaryStatCard
                    label="Total paid"
                    value={formatRupees(totals.totalPaid)}
                    description={formatFeeCollectionSummary(data.rows)}
                    valueClassName="text-green-700 dark:text-green-400"
                  />
                  <SummaryStatCard
                    label="Fees pending"
                    value={formatRupees(totals.totalPending)}
                    description={
                      totals.pendingInstallmentCount > 0
                        ? `${totals.pendingInstallmentCount} monthly installment${totals.pendingInstallmentCount === 1 ? "" : "s"} remaining`
                        : "Nothing outstanding"
                    }
                    valueClassName={
                      totals.totalPending > 0
                        ? "text-amber-700 dark:text-amber-400"
                        : undefined
                    }
                  />
                  <SummaryStatCard
                    label="Next due"
                    value={
                      hasOpenDues && summary.nextDueAmount != null
                        ? formatRupees(summary.nextDueAmount)
                        : "—"
                    }
                    description={
                      hasOpenDues && summary.nextDueDate
                        ? formatDate(summary.nextDueDate)
                        : "Fully paid"
                    }
                  />
                </SummaryStatGrid>

                <Card className="border-border/60 shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          Collection progress
                        </p>
                        <p className="text-sm text-foreground">
                          {formatRupees(totals.totalPaid)} of{" "}
                          {formatRupees(totals.planTotal)} collected (
                          {totals.progressPercent}%)
                        </p>
                      </div>
                      {hasOpenDues ? (
                        <Button
                          size="sm"
                          onClick={() => setConfirmPayOpen(true)}
                          disabled={isPaying}
                        >
                          {isPaying ? "Recording…" : "Mark next as paid"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          All installments paid
                        </div>
                      )}
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={totals.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          totals.progressPercent >= 100
                            ? "bg-green-600"
                            : "bg-primary",
                        )}
                        style={{ width: `${totals.progressPercent}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {hasOpenDues && openRow ? (
                  <Card className="border-primary/20 bg-primary/[0.03] shadow-sm">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Current due ·{" "}
                            {formatFeeHistoryRowTitle(openRow, data.rows)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {openRow.label}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-bold tabular-nums text-foreground">
                              {formatRupees(
                                summary.nextDueAmount ?? openRow.amount,
                              )}
                            </span>
                            {summary.nextDueDate ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Due {formatDate(summary.nextDueDate)}
                              </span>
                            ) : null}
                            <StatusBadge
                              label={
                                STATUS_LABEL[openRow.status] ?? openRow.status
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
                        <Button
                          onClick={() => setConfirmPayOpen(true)}
                          disabled={isPaying}
                        >
                          {isPaying ? "Recording…" : "Record payment"}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/franchisee/fees?studentId=${studentId}`}
                          >
                            <Receipt className="mr-2 h-4 w-4" />
                            Adjust plan
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : null}

            <TableSectionSurface>
              <DataTable
                data={data.rows}
                columns={columns}
                getRowId={(row) => String(row.sequence)}
                renderMainCell={(row) => (
                  <TableMainCell
                    title={formatFeeHistoryRowTitle(row, data.rows)}
                  />
                )}
                onRowClick={(row) => {
                  if (canEditInstallmentRow(row)) {
                    setEditingRow(row);
                  }
                }}
                emptyMessage="No installments scheduled for this fee plan."
              />
            </TableSectionSurface>
            <p className="text-xs text-muted-foreground px-1">
              Tap a row or use the edit action to change amount, due date, or
              paid on date. Summary totals update after you save.
            </p>
          </div>
        )}
      </TablePageShell>

      <EditFeeInstallmentDialog
        open={editingRow != null}
        onOpenChange={(open) => {
          if (!open) setEditingRow(null);
        }}
        studentId={studentId}
        row={editingRow}
        allRows={data?.rows ?? []}
        onSaved={handleInstallmentSaved}
      />

      <ConfirmDialog
        open={confirmPayOpen}
        onOpenChange={setConfirmPayOpen}
        title="Record installment payment?"
        description={
          summary?.nextDueAmount != null && summary.nextDueDate
            ? `This will mark ${formatRupees(summary.nextDueAmount)} due on ${formatDate(summary.nextDueDate)} as paid and advance the schedule.`
            : "This will mark the next open installment as paid and advance the schedule."
        }
        confirmLabel="Record payment"
        onConfirm={handleMarkAsPaid}
        isConfirming={isPaying}
      />
    </>
  );
}
