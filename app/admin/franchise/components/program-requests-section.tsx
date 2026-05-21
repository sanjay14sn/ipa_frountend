"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProgramRequestRow } from "@/services/franchise.service";
import { approveProgramRequestAdmin } from "@/services/program-request.service";
import { getErrorMessage } from "@/lib/error-utils";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import ProgramRequestsTable from "@/app/admin/program-requests/components/ProgramRequestsTable";
import { PayrollTermsDialog } from "./PayrollTermsDialog";
import type { ProgramPayroll } from "./types";
import { toast } from "sonner";

const emptyProgramPayroll = (programId = 0, programName = ""): ProgramPayroll => ({
  programId,
  programName,
  franchiseFee: 0,
  kitCost: 0,
  materialCost: 0,
  monthlyFee: 0,
  ciShare: 0,
  franchiseShare: 0,
  royalty: 0,
  gstFranchiseFee: false,
  gstRoyalty: false,
  gstMaterialCost: false,
  installment: false,
  tenure: 36,
  downPaymentAmount: 0,
  installmentMonths: 0,
});

export function ProgramRequestsSection() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<ProgramRequestRow | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [program, setProgram] = useState<ProgramPayroll>(emptyProgramPayroll());

  const triggerRefresh = () => setRefreshTrigger((p) => p + 1);

  const handleApprove = (request: ProgramRequestRow) => {
    setSelectedRequest(request);
    setProgram(
      emptyProgramPayroll(
        request.programId,
        request.program?.name ?? `Program #${request.programId}`,
      ),
    );
    setShowPayrollDialog(true);
  };

  const handleProgramChange = (
    field: keyof ProgramPayroll,
    value: string | number | boolean,
  ) => {
    setProgram((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;
    // Mirror the franchise approval validation: installment plans require a
    // positive installmentMonths so the backend can build the receivable
    // template. Catch this client-side for a friendlier error.
    if (program.installment) {
      const months = Number(program.installmentMonths) || 0;
      if (months < 1) {
        toast.error(
          "Enter a positive Installment Months value before approving an installment plan",
        );
        return;
      }
    }
    setSubmitting(true);
    try {
      await approveProgramRequestAdmin(selectedRequest.id, {
        payroll: {
          programId: program.programId,
          franchiseFee: Number(program.franchiseFee) || 0,
          kitCost: Number(program.kitCost) || 0,
          materialCost: Number(program.materialCost) || 0,
          monthlyFee: Number(program.monthlyFee) || 0,
          ciShare: Number(program.ciShare) || 0,
          franchiseShare: Number(program.franchiseShare) || 0,
          royalty: Number(program.royalty) || 0,
          installment: program.installment,
          installmentMonths: program.installment
            ? Number(program.installmentMonths) || undefined
            : undefined,
          downPaymentAmount: program.installment
            ? Number(program.downPaymentAmount) || 0
            : undefined,
          tenure: Number(program.tenure) || 36,
          gstFranchiseFee: program.gstFranchiseFee,
          gstRoyalty: program.gstRoyalty,
          gstMaterialCost: program.gstMaterialCost,
          freeload: false,
        },
        dateOfPayment: new Date().toISOString().split("T")[0],
        dateOfJoining: new Date().toISOString().split("T")[0],
      });
      toast.success("Program request approved and payroll configured");
      setShowPayrollDialog(false);
      setSelectedRequest(null);
      triggerRefresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to approve"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TablePageShell
      title="Program Requests"
      description="Review and manage program requests from franchisees with filtering and search capabilities"
      actions={
        <Button
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={triggerRefresh}
        >
          Refresh
        </Button>
      }
    >
      <TableSectionSurface className="w-full">
        <ProgramRequestsTable
          onApprove={handleApprove}
          refreshTrigger={refreshTrigger}
        />
      </TableSectionSurface>

      <PayrollTermsDialog
        open={showPayrollDialog}
        onOpenChange={(open) => {
          setShowPayrollDialog(open);
          if (!open) {
            setSelectedRequest(null);
            setProgram(emptyProgramPayroll());
          }
        }}
        subjectName={
          selectedRequest
            ? `${selectedRequest.franchise?.name ?? selectedRequest.franchiseId} – ${selectedRequest.program?.name ?? `Program #${selectedRequest.programId}`}`
            : ""
        }
        program={program}
        onProgramChange={handleProgramChange}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </TablePageShell>
  );
}
