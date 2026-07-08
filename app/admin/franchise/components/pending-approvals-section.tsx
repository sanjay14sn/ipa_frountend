"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/context/user-context";
import {
  approveFranchiseAdmin,
  createPayrollDetails,
  getFranchiseApplicationDetail,
  type FranchiseData,
  rejectFranchise,
} from "@/services/franchisee.service";
import {
  getProgramKitItems,
  setFranchiseProgramKitItems,
} from "@/services/inventory.service";
import { getErrorMessage } from "@/lib/error-utils";
import { toast } from "sonner";
import type { PayrollDetails, ProgramPayroll } from "./types";
import PendingApprovalsTable from "./PendingApprovalsTable";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { type KitRow } from "./StartingKitEditor";
import { PayrollTermsDialog } from "./PayrollTermsDialog";
import { sendClientLog } from "@/lib/client-telemetry";

const emptyProgramPayroll = (): ProgramPayroll => ({
  programId: 0,
  programName: "",
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

export function PendingApprovalsSection() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedApplication, setSelectedApplication] =
    useState<FranchiseData | null>(null);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [payrollDetails, setPayrollDetails] = useState<PayrollDetails>({
    franchiseId: "",
    programPayroll: emptyProgramPayroll(),
  });
  const [kitRows, setKitRows] = useState<KitRow[]>([]);
  const [preparePayrollLoading, setPreparePayrollLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    application: FranchiseData | null;
    reason: string;
  }>({ open: false, application: null, reason: "" });
  const [rejecting, setRejecting] = useState(false);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const invalidateApprovalQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["franchise-applications", "list"],
      }),
      queryClient.invalidateQueries({ queryKey: ["franchises", "list"] }),
      queryClient.invalidateQueries({ queryKey: ["agreements", "list"] }),
    ]);
  };

  const handleApprove = async (application: FranchiseData) => {
    setPreparePayrollLoading(true);
    try {
      const detail = await getFranchiseApplicationDetail(application.id);
      const selectedProgram =
        detail.selectedProgram ??
        (detail.agreements?.[0]?.programId != null
          ? { id: detail.agreements[0].programId, name: detail.agreements[0].programName ?? detail.agreements[0].program?.name ?? `Program #${detail.agreements[0].programId}` }
          : null) ??
        (application.agreements?.[0]?.programId != null
          ? { id: application.agreements[0].programId, name: application.agreements[0].programName ?? application.agreements[0].program?.name ?? `Program #${application.agreements[0].programId}` }
          : null);

      if (!selectedProgram) {
        toast.error(
          "No selected program was found for this application. Please refresh and try again.",
        );
        return;
      }

      const kitItems = await getProgramKitItems(selectedProgram.id).catch(() => []);
      setKitRows(
        kitItems.map((item) => ({
          programKitId: item.programKitId,
          inventoryItemName: item.name,
          defaultQuantity: item.defaultQuantity ?? 1,
          selected: true,
          quantity: item.defaultQuantity ?? 1,
        })),
      );

      setSelectedApplication(application);
      setPayrollDetails({
        franchiseId: application.id,
        programPayroll: {
          ...emptyProgramPayroll(),
          programId: selectedProgram.id,
          programName: selectedProgram.name,
        },
      });
      setShowPayrollDialog(true);
    } catch (error) {
      sendClientLog({ level: "error", event: "franchise-application-detail-load-error", message: "Error loading franchise application detail", context: { error } });
      toast.error(
        getErrorMessage(
          error,
          "Could not load the application detail. Please try again.",
        ),
      );
    } finally {
      setPreparePayrollLoading(false);
    }
  };

  const handleReject = (application: FranchiseData) => {
    if (!application?.id) return;
    setRejectDialog({ open: true, application, reason: "" });
  };

  const confirmReject = async () => {
    const { application, reason } = rejectDialog;
    if (!application) return;
    if (!reason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setRejecting(true);
    try {
      await rejectFranchise(application.id, reason.trim());
      setRejectDialog({ open: false, application: null, reason: "" });
      await invalidateApprovalQueries();
      triggerRefresh();
      toast.success("Application rejected");
    } catch (error) {
      sendClientLog({ level: "error", event: "franchise-reject-error", message: "Error rejecting franchise", context: { error } });
      toast.error(
        getErrorMessage(
          error,
          "Failed to reject application. Please try again.",
        ),
      );
    } finally {
      setRejecting(false);
    }
  };

  const submitPayrollDetails = async () => {
    if (!selectedApplication) return;

    const row = payrollDetails.programPayroll;
    if (!row.programId) {
      toast.error("A selected program is required before approval.");
      return;
    }

    try {
      await createPayrollDetails(selectedApplication.id, {
        programPayroll: {
          programId: row.programId,
          franchiseFee: Number(row.franchiseFee) || 0,
          kitCost: Number(row.kitCost) || 0,
          materialCost: Number(row.materialCost) || 0,
          monthlyFee: Number(row.monthlyFee) || 0,
          ciShare: Number(row.ciShare) || 0,
          franchiseShare: Number(row.franchiseShare) || 0,
          royalty: Number(row.royalty) || 0,
          gstFranchiseFee: Boolean(row.gstFranchiseFee ?? false),
          gstRoyalty: Boolean(row.gstRoyalty ?? false),
          gstMaterialCost: Boolean(row.gstMaterialCost ?? false),
          installment: Boolean(row.installment),
          tenure: Math.max(1, Math.floor(Number(row.tenure) || 12)),
          installmentMonths: Math.max(1, Math.floor(Number(row.installmentMonths) || 0)),
          downPaymentAmount: Number(row.downPaymentAmount) || 0,
        },
      });

      await approveFranchiseAdmin(selectedApplication.id, row.programId);

      const selectedKitItems = kitRows.filter((r) => r.selected);
      if (selectedKitItems.length > 0) {
        await setFranchiseProgramKitItems(
          selectedApplication.id,
          row.programId,
          selectedKitItems.map((r) => ({
            programKitId: r.programKitId,
            quantity: r.quantity,
          })),
        ).catch(() => {
          toast.warning(
            "Application approved, but starting kit could not be saved. Edit it from the franchise page.",
          );
        });
      }

      await invalidateApprovalQueries();

      setShowPayrollDialog(false);
      setSelectedApplication(null);
      setPayrollDetails({
        franchiseId: "",
        programPayroll: emptyProgramPayroll(),
      });
      setKitRows([]);
      triggerRefresh();
      toast.success("Agreement terms saved and application approved");
    } catch (error) {
      sendClientLog({ level: "error", event: "franchise-approval-terms-error", message: "Error submitting approval terms", context: { error } });
      toast.error(
        getErrorMessage(
          error,
          "Failed to save terms or approve the application. Please try again.",
        ),
      );
    }
  };

  const handleProgramPayrollChange = (
    field: keyof ProgramPayroll,
    value: string | number | boolean,
  ) => {
    setPayrollDetails((prev) => ({
      ...prev,
      programPayroll: {
        ...prev.programPayroll,
        [field]: value,
      },
    }));
  };

  const program = payrollDetails.programPayroll;

  return (
    <TablePageShell
      title="Franchise Applications"
      description="Review pending applications, inspect rejected ones, and approve pending rows after saving agreement terms."
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
        <PendingApprovalsTable
          onApprove={handleApprove}
          // Reject is SuperAdmin-guarded on the backend — hide it for staff.
          onReject={user?.adminRole === "super" ? handleReject : undefined}
          refreshTrigger={refreshTrigger}
          disableApproveActions={preparePayrollLoading}
        />
      </TableSectionSurface>

      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Franchise Application</DialogTitle>
            <DialogDescription>
              Rejecting the application for &ldquo;
              {rejectDialog.application?.name}&rdquo;. This will notify the
              franchisee. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="franchise-reject-reason">Reason</Label>
            <Textarea
              id="franchise-reject-reason"
              placeholder="Enter rejection reason..."
              value={rejectDialog.reason}
              onChange={(e) =>
                setRejectDialog((prev) => ({
                  ...prev,
                  reason: e.target.value,
                }))
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={rejecting}
              onClick={() =>
                setRejectDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejecting || !rejectDialog.reason.trim()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayrollTermsDialog
        open={showPayrollDialog}
        onOpenChange={(open) => {
          setShowPayrollDialog(open);
          if (!open) {
            setSelectedApplication(null);
            setPayrollDetails({
              franchiseId: "",
              programPayroll: emptyProgramPayroll(),
            });
            setKitRows([]);
          }
        }}
        subjectName={selectedApplication?.name ?? ""}
        program={program}
        onProgramChange={handleProgramPayrollChange}
        kitRows={kitRows}
        onKitRowsChange={setKitRows}
        onSubmit={submitPayrollDetails}
      />
    </TablePageShell>
  );
}
