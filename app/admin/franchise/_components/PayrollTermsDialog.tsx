"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog } from "@/components/shared/dialog";
import { IndianRupee, Package, Settings } from "lucide-react";
import {
  AgreementTermsFields,
  type AgreementTermsFieldsValue,
} from "@/components/agreements/agreement-terms-fields";
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
  const termsValue: AgreementTermsFieldsValue = {
    tenure: program.tenure,
    franchiseFee: program.franchiseFee,
    monthlyFee: program.monthlyFee,
    royalty: program.royalty,
    materialCost: program.materialCost,
    kitCost: program.kitCost,
    ciShare: program.ciShare,
    franchiseShare: program.franchiseShare,
    gstFranchiseFee: program.gstFranchiseFee,
    gstRoyalty: program.gstRoyalty,
    gstMaterialCost: program.gstMaterialCost,
    installment: program.installment,
    installmentMonths: program.installmentMonths,
    downPayment: program.downPaymentAmount,
  };

  /**
   * Bridge the shared fields onto ProgramPayroll, keeping this dialog's
   * long-standing coercions: a cleared tenure snaps back to 36, and
   * installment months floor to at least 1 while typing.
   */
  const applyTermsPatch = (patch: Partial<AgreementTermsFieldsValue>) => {
    for (const [key, raw] of Object.entries(patch)) {
      if (key === "downPayment") {
        onProgramChange("downPaymentAmount", raw as number);
        continue;
      }
      let value = raw as number | boolean;
      if (key === "tenure") {
        const n = raw as number;
        value = n ? Math.max(1, Math.floor(n)) : 36;
      }
      if (key === "installmentMonths") {
        const n = raw as number;
        value = n === 0 ? 0 : Math.max(1, Math.floor(n) || 1);
      }
      onProgramChange(key as keyof ProgramPayroll, value);
    }
  };

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
                <AgreementTermsFields
                  idPrefix="payroll-terms"
                  value={termsValue}
                  onChange={applyTermsPatch}
                />
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
