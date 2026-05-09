"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, IndianRupee, Package, Settings } from "lucide-react";
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
import { StartingKitEditor, type KitRow } from "./StartingKitEditor";

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
        detail.franchise?.program ??
        application.program ??
        application.franchisePrograms?.[0]?.program;

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
      console.error("Error loading franchise application detail:", error);
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

  const handleReject = async (application: FranchiseData) => {
    if (!application?.id) return;
    const confirmed = window.confirm(
      `Reject franchise application for "${application.name}"? This will notify the franchisee.`,
    );
    if (!confirmed) return;

    try {
      await rejectFranchise(application.id);
      await invalidateApprovalQueries();
      triggerRefresh();
      toast.success("Application rejected");
    } catch (error) {
      console.error("Error rejecting franchise:", error);
      toast.error(
        getErrorMessage(
          error,
          "Failed to reject application. Please try again.",
        ),
      );
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
      console.error("Error submitting approval terms:", error);
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
          onReject={handleReject}
          refreshTrigger={refreshTrigger}
          disableApproveActions={preparePayrollLoading}
        />
      </TableSectionSurface>

      <Dialog
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
      >
        <DialogContent className="max-h-[90vh] max-w-5xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-4 py-5 sm:px-5">
            <div className="mb-3 flex">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                Agreement terms
              </span>
            </div>
            <DialogTitle className="flex items-center gap-2 text-2xl font-normal tracking-tight text-card-foreground">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Settings className="h-4 w-4" />
              </span>
              Setup terms for {selectedApplication?.name}
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-sm text-muted-foreground">
              Save the fixed agreement terms for the selected program, then
              approve the application and issue the draft agreement for
              signature.
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="max-h-[calc(90vh-118px)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                  <IndianRupee className="h-4 w-4" />
                  Selected program agreement terms
                </h3>

                <Card className="overflow-hidden rounded-xl border-border shadow-sm">
                  <CardHeader className="border-b border-border bg-accent/30 px-4 py-4">
                    <CardTitle className="text-base font-medium text-card-foreground">
                      {program.programName}
                    </CardTitle>
                    <p className="mt-1 text-sm font-normal text-muted-foreground">
                      These fixed columns map directly to the backend agreement
                      terms.
                    </p>
                  </CardHeader>

                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Franchise Fee
                          </Label>
                          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                            <input
                              type="checkbox"
                              checked={program.gstFranchiseFee}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  "gstFranchiseFee",
                                  e.target.checked,
                                )
                              }
                            />
                            <span className="text-xs text-primary">
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.franchiseFee || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "franchiseFee",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          Kit Cost
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.kitCost || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "kitCost",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Material Cost
                          </Label>
                          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                            <input
                              type="checkbox"
                              checked={program.gstMaterialCost}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  "gstMaterialCost",
                                  e.target.checked,
                                )
                              }
                            />
                            <span className="text-xs text-primary">
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.materialCost || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "materialCost",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          Monthly Fee
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.monthlyFee || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "monthlyFee",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium text-card-foreground">
                            Royalty
                          </Label>
                          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
                            <input
                              type="checkbox"
                              checked={program.gstRoyalty}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  "gstRoyalty",
                                  e.target.checked,
                                )
                              }
                            />
                            <span className="text-xs text-primary">
                              GST Inc.
                            </span>
                          </label>
                        </div>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.royalty || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "royalty",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          CI Share
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.ciShare || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "ciShare",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          Franchise Share
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={program.franchiseShare || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "franchiseShare",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            className="h-10 pl-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          Agreement Tenure (months)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={program.tenure || ""}
                            onChange={(e) =>
                              handleProgramPayrollChange(
                                "tenure",
                                e.target.value === ""
                                  ? 36
                                  : Math.max(1, Math.floor(Number(e.target.value) || 36)),
                              )
                            }
                            className="h-10"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2 lg:col-span-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`installment-${program.programId}`}
                            checked={program.installment}
                            onCheckedChange={(checked) =>
                              handleProgramPayrollChange(
                                "installment",
                                checked === true,
                              )
                            }
                          />
                          <Label
                            htmlFor={`installment-${program.programId}`}
                            className="cursor-pointer text-sm font-medium text-card-foreground"
                          >
                            Installment plan
                          </Label>
                        </div>
                        <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-card-foreground">
                              Installment Months (months)
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={program.installmentMonths || ""}
                              disabled={!program.installment}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  "installmentMonths",
                                  e.target.value === ""
                                    ? 0
                                    : Math.max(
                                        1,
                                        Math.floor(Number(e.target.value)) || 1,
                                      ),
                                )
                              }
                              className="h-10"
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-card-foreground">
                              Down Payment Amount
                            </Label>
                            <Input
                              type="number"
                              value={program.downPaymentAmount || ""}
                              disabled={!program.installment}
                              onChange={(e) =>
                                handleProgramPayrollChange(
                                  "downPaymentAmount",
                                  e.target.value === ""
                                    ? 0
                                    : Number(e.target.value),
                                )
                              }
                              className="h-10"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {kitRows.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                      <Package className="h-4 w-4" />
                      Starting kit items
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      These items will be allocated to the franchise on approval.
                      Uncheck items to exclude or adjust quantities.
                    </p>
                    <StartingKitEditor rows={kitRows} onChange={setKitRows} />
                  </div>
                )}
              </div>

              <div className="-mx-4 mt-4 flex flex-col-reverse gap-3 border-t border-border px-4 pb-1 pt-4 sm:-mx-5 sm:flex-row sm:px-5">
                <Button
                  variant="outline"
                  onClick={() => setShowPayrollDialog(false)}
                  className="h-10 rounded-lg sm:px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitPayrollDetails}
                  className="h-10 flex-1 rounded-lg text-sm font-medium"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save terms and approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TablePageShell>
  );
}
