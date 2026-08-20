"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/shared/dialog";
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
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { PayrollDetails, ProgramPayroll } from "./types";
import PendingApprovalsTable from "./PendingApprovalsTable";
import { TablePageShell, TableSectionSurface } from "@/components/shared";
import { type KitRow } from "./StartingKitEditor";
import { PayrollTermsDialog } from "./PayrollTermsDialog";
import { sendClientLog } from "@/lib/client-telemetry";
import {
  PasswordSetFields,
  validatePasswordSet,
  type PasswordSetErrors,
} from "@/components/shared/password-set-fields";

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
  const [credentialPassword, setCredentialPassword] = useState("");
  const [credentialConfirm, setCredentialConfirm] = useState("");
  const [credentialErrors, setCredentialErrors] = useState<PasswordSetErrors>(
    {},
  );
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
          ? { id: detail.agreements[0].programId, name: detail.agreements[0].programName ?? detail.agreements[0].program?.name ?? "Program" }
          : null) ??
        (application.agreements?.[0]?.programId != null
          ? { id: application.agreements[0].programId, name: application.agreements[0].programName ?? application.agreements[0].program?.name ?? "Program" }
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

    // Approval issues the franchisee's portal password — admin-typed, so it
    // must validate before any backend call.
    const passwordErrors = validatePasswordSet(
      credentialPassword,
      credentialConfirm,
    );
    setCredentialErrors(passwordErrors);
    if (Object.keys(passwordErrors).length > 0) return;

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

      await approveFranchiseAdmin(
        selectedApplication.id,
        credentialPassword,
        row.programId,
      );

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
      setCredentialPassword("");
      setCredentialConfirm("");
      setCredentialErrors({});
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
    <TablePageShell embed>
      {/* R6: the hub owns the page header; this section renders toolbar + content only. */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={triggerRefresh}>
          Refresh
        </Button>
      </div>
      <TableSectionSurface className="w-full">
        <PendingApprovalsTable
          onApprove={handleApprove}
          // Reject is SuperAdmin-guarded on the backend — hide it for staff.
          onReject={user?.adminRole === "super" ? handleReject : undefined}
          refreshTrigger={refreshTrigger}
          disableApproveActions={preparePayrollLoading}
        />
      </TableSectionSurface>

      <FormDialog
        open={rejectDialog.open}
        onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}
        size="md"
        title="Reject Franchise Application"
        description={
          <>
            Rejecting the application for &ldquo;
            {rejectDialog.application?.name}&rdquo;. This will notify the
            franchisee. Please provide a reason.
          </>
        }
        formId="franchise-reject-form"
        onSubmit={(e) => {
          e.preventDefault();
          confirmReject();
        }}
        isSubmitting={rejecting}
        submitLabel="Reject"
        cancelLabel="Cancel"
        canSubmit={!rejecting && Boolean(rejectDialog.reason.trim())}
      >
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
      </FormDialog>

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
            setCredentialPassword("");
            setCredentialConfirm("");
            setCredentialErrors({});
          }
        }}
        subjectName={selectedApplication?.name ?? ""}
        program={program}
        onProgramChange={handleProgramPayrollChange}
        kitRows={kitRows}
        onKitRowsChange={setKitRows}
        onSubmit={submitPayrollDetails}
        extraContent={
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              <KeyRound className="h-4 w-4" />
              Franchisee portal credentials
            </h3>
            <p className="text-sm text-muted-foreground">
              Set the password the franchisee will use to log in. It is
              emailed to them when the application is approved.
            </p>
            <PasswordSetFields
              password={credentialPassword}
              confirmPassword={credentialConfirm}
              onPasswordChange={(value) => {
                setCredentialPassword(value);
                if (credentialErrors.password)
                  setCredentialErrors((prev) => ({
                    ...prev,
                    password: undefined,
                  }));
              }}
              onConfirmPasswordChange={(value) => {
                setCredentialConfirm(value);
                if (credentialErrors.confirmPassword)
                  setCredentialErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
              }}
              errors={credentialErrors}
              idPrefix="approve-franchisee"
            />
          </div>
        }
      />
    </TablePageShell>
  );
}
