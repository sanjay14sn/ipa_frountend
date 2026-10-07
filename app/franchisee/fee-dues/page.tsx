"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Calendar, Receipt, CheckCircle2 } from "lucide-react";
import { getFeeRuleLabel } from "./_components/fee-rule-label";
import { PageHeaderCard } from "@/components/shared/page-header-card";
import { PageSkeleton } from "@/components/shared/skeletons";
import { useStudents } from "@/hooks/api/student.hooks";
import { queryKeys } from "@/hooks/api/query-keys";
import type { StudentData } from "@/services/student.service";
import { formatRupees } from "@/lib/currency-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  listStudentFeeSummaries,
  markStudentFeeAsPaid,
} from "@/services/student-fee.service";
import { toast } from "sonner";
import { formatDate } from "@/lib/date-utils";
import { extractErrorMessage } from "@/lib/error-utils";

const UNCONFIGURED_FEE: NonNullable<StudentData["feeConfiguration"]> = {
  configured: false,
  nextDueDate: null,
  nextDueAmount: null,
  totalPayable: null,
};

export default function FeeDuesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { students, isLoading: studentsLoading, revalidate } = useStudents({
    status: "active",
  });
  const { data: feeSummaries } = useQuery({
    queryKey: queryKeys.students.feeSummaries,
    queryFn: listStudentFeeSummaries,
    staleTime: 30_000,
  });
  const [isPaying, setIsPaying] = useState<Record<number, boolean>>({});

  const handleMarkAsPaid = async (studentId: number) => {
    try {
      setIsPaying((prev) => ({ ...prev, [studentId]: true }));
      await markStudentFeeAsPaid(studentId);
      toast.success("Fee marked as paid successfully.");
      await Promise.all([
        revalidate(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.students.feeSummaries,
        }),
        queryClient.invalidateQueries({ queryKey: ["student-fee-history"] }),
      ]);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Failed to mark fee as paid."));
    } finally {
      setIsPaying((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  const summaryByStudentId = useMemo(() => {
    const map = new Map<number, NonNullable<StudentData["feeConfiguration"]>>();
    for (const row of feeSummaries ?? []) {
      const { studentId, ...summary } = row;
      map.set(studentId, summary);
    }
    return map;
  }, [feeSummaries]);

  const studentList = useMemo(() => {
    if (!students) return [];

    const merged = students.map((student) => ({
      ...student,
      feeConfiguration:
        summaryByStudentId.get(student.id) ??
        student.feeConfiguration ??
        UNCONFIGURED_FEE,
    }));

    return merged.sort((a, b) => {
      const aDue = a.feeConfiguration?.nextDueDate
        ? new Date(a.feeConfiguration.nextDueDate).getTime()
        : Infinity;
      const bDue = b.feeConfiguration?.nextDueDate
        ? new Date(b.feeConfiguration.nextDueDate).getTime()
        : Infinity;
      return aDue - bDue;
    });
  }, [students, summaryByStudentId]);

  if (studentsLoading) return <PageSkeleton />;

  return (
    <div className="w-full space-y-6">
      <PageHeaderCard
        title="Fee Dues"
        description="Synced with Student Fee Setup — plan total is registration + course fee; next due follows your fee rule, duration, and installment days. Tap a row for history."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/franchisee/fees">Fee setup</Link>
          </Button>
        }
      />

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {studentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Students Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                There are currently no active students to display.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">Student Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Roll No</TableHead>
                  <TableHead className="font-semibold text-foreground">Fee Rule</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">
                    Plan Total
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right">
                    Next Due
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    Due Date
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentList.map((student) => {
                  const feeConfig = student.feeConfiguration;
                  const isFullCourse = feeConfig?.feeRule === "REG_PLUS_FULL_COURSE";
                  const hasOpenDues = Boolean(
                    feeConfig?.configured &&
                      feeConfig.nextDueDate &&
                      feeConfig.nextDueAmount != null &&
                      feeConfig.nextDueAmount > 0,
                  );
                  const showInstallmentDue = hasOpenDues && !isFullCourse;

                  const dueDate = showInstallmentDue
                    ? new Date(feeConfig!.nextDueDate!)
                    : null;
                  
                  let pastDue = false;
                  let todayDue = false;

                  if (dueDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const compareDate = new Date(dueDate);
                    compareDate.setHours(0, 0, 0, 0);
                    pastDue = compareDate < today;
                    todayDue = compareDate.getTime() === today.getTime();
                  }

                  return (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/franchisee/fee-dues/${student.id}`)
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          {student.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{student.rollNo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-background text-xs font-medium text-muted-foreground">
                          {getFeeRuleLabel(feeConfig?.feeRule)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {feeConfig?.configured &&
                        feeConfig.planTotal != null &&
                        feeConfig.planTotal > 0
                          ? formatRupees(feeConfig.planTotal)
                          : feeConfig?.configured &&
                              feeConfig.totalPayable != null
                            ? formatRupees(feeConfig.totalPayable)
                            : "-"}
                      </TableCell>
                      {isFullCourse ? (
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Full course fee is collected upfront. No installment is scheduled.
                        </TableCell>
                      ) : (
                        <>
                      <TableCell className="text-right">
                        {showInstallmentDue ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-bold text-foreground">
                              {formatRupees(feeConfig.nextDueAmount!)}
                            </span>
                            {feeConfig.monthlyInstallment != null &&
                            feeConfig.monthlyInstallment > 0 &&
                            feeConfig.feeRule !== "CUSTOM" &&
                            feeConfig.nextDueAmount !==
                              feeConfig.monthlyInstallment ? (
                              <span className="text-[11px] text-muted-foreground">
                                then {formatRupees(feeConfig.monthlyInstallment)}
                                /mo
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {showInstallmentDue && dueDate ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className={pastDue ? "text-destructive font-medium" : ""}>
                              {formatDate(dueDate)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!feeConfig?.configured ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground border-transparent shadow-none">
                            Not Configured
                          </Badge>
                        ) : !hasOpenDues ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-transparent font-semibold shadow-none">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Fully Paid
                          </Badge>
                        ) : pastDue ? (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20 font-semibold shadow-none">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : todayDue ? (
                          <Badge variant="default" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/25 font-semibold shadow-none">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Due Today
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-transparent hover:bg-primary/20 font-semibold shadow-none">
                            Upcoming
                          </Badge>
                        )}
                      </TableCell>
                        </>
                      )}
                      <TableCell className="text-right">
                        {showInstallmentDue ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaid(student.id);
                            }}
                            disabled={isPaying[student.id]}
                          >
                            {isPaying[student.id] ? "Processing..." : "Mark as Paid"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
