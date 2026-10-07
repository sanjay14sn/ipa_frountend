"use client";

import { use } from "react";

import { TableErrorState, TablePageShell } from "@/components/shared";
import { StudentFeeHistoryView } from "./_components/student-fee-history-view";

export default function StudentFeeHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: studentIdParam } = use(params);
  const studentId = Number(studentIdParam);

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <TablePageShell title="Fee history" description="Invalid student.">
        <TableErrorState message="Couldn't load fee history" />
      </TablePageShell>
    );
  }

  return <StudentFeeHistoryView studentId={studentId} />;
}
