"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, IndianRupee, Package, Settings } from "lucide-react";
import { StartingKitEditor, type KitRow } from "./StartingKitEditor";
import type { ProgramPayroll } from "./types";

interface PayrollTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown in the dialog title, e.g. franchise or franchise + program name */
  subjectName: string;
  program: ProgramPayroll;
  onProgramChange: (
    field: keyof ProgramPayroll,
    value: string | number | boolean,
  ) => void;
  kitRows?: KitRow[];
  onKitRowsChange?: (rows: KitRow[]) => void;
  onSubmit: () => void;
  submitting?: boolean;
  /** Rendered above the payroll card — use for extra fields like dates */
  extraContent?: ReactNode;
}

export function PayrollTermsDialog({
  open,
  onOpenChange,
  subjectName,
  program,
  onProgramChange,
  kitRows = [],
  onKitRowsChange,
  onSubmit,
  submitting = false,
  extraContent,
}: PayrollTermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-5 sm:px-5">
          <div className="mb-3 flex">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
              Agreement terms
            </span>
          </div>
          <DialogTitle className="flex items-center gap-2 text-2xl font-normal tracking-tight text-card-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Settings className="h-4 w-4" />
            </span>
            Setup terms for {subjectName}
          </DialogTitle>
          <DialogDescription className="max-w-3xl text-sm text-muted-foreground">
            Save the fixed agreement terms for the selected program, then
            approve the application and issue the draft agreement for signature.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {extraContent}

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
                  {/* Franchise Fee */}
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
                            onProgramChange("gstFranchiseFee", e.target.checked)
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={program.franchiseFee || ""}
                        onChange={(e) =>
                          onProgramChange(
                            "franchiseFee",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Kit Cost */}
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
                          onProgramChange(
                            "kitCost",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Material Cost */}
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
                            onProgramChange(
                              "gstMaterialCost",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={program.materialCost || ""}
                        onChange={(e) =>
                          onProgramChange(
                            "materialCost",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Monthly Fee */}
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
                          onProgramChange(
                            "monthlyFee",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Royalty */}
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
                            onProgramChange("gstRoyalty", e.target.checked)
                          }
                        />
                        <span className="text-xs text-primary">GST Inc.</span>
                      </label>
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={program.royalty || ""}
                        onChange={(e) =>
                          onProgramChange(
                            "royalty",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* CI Share */}
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
                          onProgramChange(
                            "ciShare",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Franchise Share */}
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
                          onProgramChange(
                            "franchiseShare",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        className="h-10 pl-10"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Tenure */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-card-foreground">
                      Agreement Tenure (months)
                    </Label>
                    <Input
                      type="number"
                      value={program.tenure || ""}
                      onChange={(e) =>
                        onProgramChange(
                          "tenure",
                          e.target.value === ""
                            ? 36
                            : Math.max(
                                1,
                                Math.floor(Number(e.target.value) || 36),
                              ),
                        )
                      }
                      className="h-10"
                      placeholder="0"
                    />
                  </div>

                  {/* Installment */}
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="installment-plan"
                        checked={program.installment}
                        onCheckedChange={(checked) =>
                          onProgramChange("installment", checked === true)
                        }
                      />
                      <Label
                        htmlFor="installment-plan"
                        className="cursor-pointer text-sm font-medium text-card-foreground"
                      >
                        Installment plan
                      </Label>
                    </div>
                    <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-card-foreground">
                          Installment Months
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={program.installmentMonths || ""}
                          disabled={!program.installment}
                          onChange={(e) =>
                            onProgramChange(
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
                            onProgramChange(
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

            {kitRows.length > 0 && onKitRowsChange && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                  <Package className="h-4 w-4" />
                  Starting kit items
                </h3>
                <p className="text-sm text-muted-foreground">
                  These items will be allocated to the franchise on approval.
                  Uncheck items to exclude or adjust quantities.
                </p>
                <StartingKitEditor rows={kitRows} onChange={onKitRowsChange} />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-4 sm:px-5">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-lg sm:px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="h-10 rounded-lg text-sm font-medium sm:min-w-[220px]"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {submitting ? "Saving..." : "Save terms and approve"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
