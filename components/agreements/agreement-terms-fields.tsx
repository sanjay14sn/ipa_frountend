"use client";

import { IndianRupee } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DialogFormField, DialogFormGrid } from "@/components/shared/dialog";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { AgreementRecord } from "@/services/agreement.service";

/**
 * The FRANCHISE/PROGRAM money terms shared by every form that writes them:
 * the edit-franchise "Agreement terms" section and the renewal dialog. Title
 * and notes stay with the edit section — a renewal derives its own title.
 */
export interface AgreementTermsFieldsValue {
  tenure: number;
  franchiseFee: number;
  monthlyFee: number;
  royalty: number;
  materialCost: number;
  kitCost: number;
  ciShare: number;
  franchiseShare: number;
  gstFranchiseFee: boolean;
  gstRoyalty: boolean;
  gstMaterialCost: boolean;
  installment: boolean;
  installmentMonths: number;
  downPayment: number;
}

export function agreementTermsFieldsFromRecord(
  agreement: AgreementRecord,
): AgreementTermsFieldsValue {
  return {
    // D9: no `?? 12` fallback. A DRAFT has tenure null, and showing 12 made the
    // field look stored — the diff then compared 12 to 12, never sent it, and
    // the agreement kept null while the admin believed they had kept 12 months.
    // 0 renders as an empty field (see `value.tenure || ""`) and the pre-submit
    // guard forces a real value.
    tenure: agreement.tenure ?? 0,
    franchiseFee: agreement.franchiseFee ?? 0,
    monthlyFee: agreement.monthlyFee ?? 0,
    royalty: agreement.royalty ?? 0,
    materialCost: agreement.materialCost ?? 0,
    kitCost: agreement.kitCost ?? 0,
    ciShare: agreement.ciShare ?? 0,
    franchiseShare: agreement.franchiseShare ?? 0,
    gstFranchiseFee: agreement.gstFranchiseFee ?? false,
    gstRoyalty: agreement.gstRoyalty ?? false,
    gstMaterialCost: agreement.gstMaterialCost ?? false,
    installment: agreement.installment ?? false,
    installmentMonths: agreement.installmentMonths ?? 0,
    downPayment: agreement.downPayment ?? 0,
  };
}

/**
 * Pre-submit guards mirroring the backend's own invariants, so the admin gets
 * a specific message instead of a 400. Shared by the terms PATCH and the renew
 * endpoint — both feed the same plan builder.
 *
 * `requirePositiveFee` — the backend keeps a payable (APPROVED) agreement
 * payable; a renewal is born APPROVED, so it needs a real fee too.
 *
 * Returns an error message, or null when the terms are submittable.
 */
export function validateAgreementTermsFields(
  form: AgreementTermsFieldsValue,
  opts?: { requirePositiveFee?: boolean },
): string | null {
  if (form.tenure < 1) {
    return "Enter the agreement tenure in months";
  }
  if (opts?.requirePositiveFee && form.franchiseFee <= 0) {
    return "Franchise fee must be greater than zero while the agreement is approved";
  }
  if (form.installment) {
    if (form.installmentMonths < 1) {
      return "Enter a positive Installment Months value for the installment plan";
    }
    // A7: the plan builder splits (franchiseFee - downPayment) into monthly
    // parts, so a down payment at or above the fee yields negative installments.
    if (form.downPayment > 0 && form.downPayment >= form.franchiseFee) {
      return "Down payment must be less than the franchise fee";
    }
  }
  return null;
}

interface RupeeInputProps {
  id: string;
  value: number;
  onChange: (value: number) => void;
}

function RupeeInput({ id, value, onChange }: RupeeInputProps) {
  return (
    <div className="relative">
      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        id={id}
        type="number"
        min={0}
        value={value || ""}
        // D10: `min` is only an attribute — type="number" still yields "-5", and
        // the old handler passed it straight through. Clamp at the source so no
        // negative amount can reach the sparse patch. NaN (a stray "e", "-")
        // collapses to 0 rather than poisoning the diff.
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "" ? 0 : Math.max(0, Number(raw) || 0));
        }}
        onFocus={selectInputValueOnFocus}
        className="h-10 pl-10"
        placeholder="0"
      />
    </div>
  );
}

export interface AgreementTermsFieldsProps {
  /** Namespaces every field id (`${idPrefix}-fee`, …) so two forms never clash. */
  idPrefix: string;
  value: AgreementTermsFieldsValue;
  onChange: (patch: Partial<AgreementTermsFieldsValue>) => void;
}

/**
 * Fee grid + GST-inclusive checkboxes + installment plan block. Pure inputs —
 * the owning form holds the state and runs `validateAgreementTermsFields`.
 */
export function AgreementTermsFields({
  idPrefix,
  value,
  onChange,
}: AgreementTermsFieldsProps) {
  return (
    <div className="space-y-4" data-testid="agreement-terms-fields">
      <DialogFormGrid cols={2}>
        <DialogFormField id={`${idPrefix}-fee`} label="Franchise Fee *">
          <RupeeInput
            id={`${idPrefix}-fee`}
            value={value.franchiseFee}
            onChange={(franchiseFee) => onChange({ franchiseFee })}
          />
        </DialogFormField>
        <DialogFormField id={`${idPrefix}-kit-cost`} label="Kit Cost">
          <RupeeInput
            id={`${idPrefix}-kit-cost`}
            value={value.kitCost}
            onChange={(kitCost) => onChange({ kitCost })}
          />
        </DialogFormField>
        <DialogFormField id={`${idPrefix}-material-cost`} label="Material Cost">
          <RupeeInput
            id={`${idPrefix}-material-cost`}
            value={value.materialCost}
            onChange={(materialCost) => onChange({ materialCost })}
          />
        </DialogFormField>
        <DialogFormField id={`${idPrefix}-monthly-fee`} label="Monthly Fee">
          <RupeeInput
            id={`${idPrefix}-monthly-fee`}
            value={value.monthlyFee}
            onChange={(monthlyFee) => onChange({ monthlyFee })}
          />
        </DialogFormField>
        <DialogFormField id={`${idPrefix}-royalty`} label="Royalty">
          <RupeeInput
            id={`${idPrefix}-royalty`}
            value={value.royalty}
            onChange={(royalty) => onChange({ royalty })}
          />
        </DialogFormField>
        <DialogFormField id={`${idPrefix}-ci-share`} label="CI Share">
          <RupeeInput
            id={`${idPrefix}-ci-share`}
            value={value.ciShare}
            onChange={(ciShare) => onChange({ ciShare })}
          />
        </DialogFormField>
        <DialogFormField
          id={`${idPrefix}-franchise-share`}
          label="Franchise Share"
        >
          <RupeeInput
            id={`${idPrefix}-franchise-share`}
            value={value.franchiseShare}
            onChange={(franchiseShare) => onChange({ franchiseShare })}
          />
        </DialogFormField>
        <DialogFormField
          id={`${idPrefix}-tenure`}
          label="Agreement Tenure (months) *"
        >
          <Input
            id={`${idPrefix}-tenure`}
            type="number"
            min={1}
            value={value.tenure || ""}
            onChange={(event) =>
              onChange({
                tenure:
                  event.target.value === "" ? 0 : Number(event.target.value),
              })
            }
            onFocus={selectInputValueOnFocus}
            className="h-10"
            placeholder="12"
          />
        </DialogFormField>
      </DialogFormGrid>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.gstFranchiseFee}
            onCheckedChange={(checked) =>
              onChange({ gstFranchiseFee: checked === true })
            }
          />
          Franchise fee incl. GST
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.gstRoyalty}
            onCheckedChange={(checked) =>
              onChange({ gstRoyalty: checked === true })
            }
          />
          Royalty incl. GST
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.gstMaterialCost}
            onCheckedChange={(checked) =>
              onChange({ gstMaterialCost: checked === true })
            }
          />
          Material cost incl. GST
        </label>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={value.installment}
            onCheckedChange={(checked) =>
              onChange({ installment: checked === true })
            }
          />
          Installment plan
        </label>
        {value.installment ? (
          <DialogFormGrid cols={2}>
            <DialogFormField
              id={`${idPrefix}-installment-months`}
              label="Installment Months *"
            >
              <Input
                id={`${idPrefix}-installment-months`}
                type="number"
                min={1}
                value={value.installmentMonths || ""}
                onChange={(event) =>
                  onChange({
                    installmentMonths:
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
                  })
                }
                onFocus={selectInputValueOnFocus}
                className="h-10"
                placeholder="6"
              />
            </DialogFormField>
            <DialogFormField
              id={`${idPrefix}-down-payment`}
              label="Down Payment Amount"
            >
              <RupeeInput
                id={`${idPrefix}-down-payment`}
                value={value.downPayment}
                onChange={(downPayment) => onChange({ downPayment })}
              />
            </DialogFormField>
          </DialogFormGrid>
        ) : null}
      </div>
    </div>
  );
}
