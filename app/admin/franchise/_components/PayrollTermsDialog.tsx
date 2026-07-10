"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/shared/dialog";
import { IndianRupee, Package, Settings } from "lucide-react";
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

function RupeeField({
  label,
  field,
  value,
  onProgramChange,
  gstField,
  gstChecked,
}: {
  label: string;
  field: keyof ProgramPayroll;
  value: number;
  onProgramChange: PayrollTermsDialogProps["onProgramChange"];
  gstField?: keyof ProgramPayroll;
  gstChecked?: boolean;
}) {
  const labelNode = (
    <Label className="text-sm font-medium text-card-foreground">{label}</Label>
  );
  return (
    <div className="space-y-2">
      {gstField ? (
        <div className="flex items-center gap-2">
          {labelNode}
          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
            <input
              type="checkbox"
              checked={gstChecked}
              onChange={(e) => onProgramChange(gstField, e.target.checked)}
            />
            <span className="text-xs text-primary">GST Inc.</span>
          </label>
        </div>
      ) : (
        labelNode
      )}
      <div className="relative">
        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          value={value || ""}
          onChange={(e) =>
            onProgramChange(
              field,
              e.target.value === "" ? 0 : Number(e.target.value),
            )
          }
          className="h-10 pl-10"
          placeholder="0"
        />
      </div>
    </div>
  );
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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      scrollBody
      headerEyebrow="Agreement terms"
      headerIcon={Settings}
      title={`Setup terms for ${subjectName}`}
      description="Save the fixed agreement terms for the selected program, then approve the application and issue the draft agreement for signature."
      formId="payroll-terms-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      isSubmitting={submitting}
      submitLabel={submitting ? "Saving..." : "Save terms and approve"}
      cancelLabel="Cancel"
    >
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
                  <RupeeField
                    label="Franchise Fee"
                    field="franchiseFee"
                    value={program.franchiseFee}
                    onProgramChange={onProgramChange}
                    gstField="gstFranchiseFee"
                    gstChecked={program.gstFranchiseFee}
                  />

                  <RupeeField
                    label="Kit Cost"
                    field="kitCost"
                    value={program.kitCost}
                    onProgramChange={onProgramChange}
                  />

                  <RupeeField
                    label="Material Cost"
                    field="materialCost"
                    value={program.materialCost}
                    onProgramChange={onProgramChange}
                    gstField="gstMaterialCost"
                    gstChecked={program.gstMaterialCost}
                  />

                  <RupeeField
                    label="Monthly Fee"
                    field="monthlyFee"
                    value={program.monthlyFee}
                    onProgramChange={onProgramChange}
                  />

                  <RupeeField
                    label="Royalty"
                    field="royalty"
                    value={program.royalty}
                    onProgramChange={onProgramChange}
                    gstField="gstRoyalty"
                    gstChecked={program.gstRoyalty}
                  />

                  <RupeeField
                    label="CI Share"
                    field="ciShare"
                    value={program.ciShare}
                    onProgramChange={onProgramChange}
                  />

                  <RupeeField
                    label="Franchise Share"
                    field="franchiseShare"
                    value={program.franchiseShare}
                    onProgramChange={onProgramChange}
                  />

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
    </FormDialog>
  );
}
