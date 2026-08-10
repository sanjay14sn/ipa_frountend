"use client";

import { IndianRupee } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type { AgreementRecord } from "@/services/agreement.service";

/**
 * The FRANCHISE/PROGRAM money terms shared by every form that writes them:
 * the application-approval terms setter (PayrollTermsDialog), the
 * edit-franchise "Agreement terms" section and the renewal dialog. Title
 * and notes stay with the edit section — a renewal derives its own title.
 *
 * The markup is the terms-setter design: "GST Inc." pill beside the field
 * label, 3-column grid, installment card with disabled-until-enabled inputs.
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

interface RupeeFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Renders the "GST Inc." pill beside the label (terms-setter style). */
  gst?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** Accessible name — the visible pill says only "GST Inc." three times. */
    ariaLabel: string;
  };
}

function RupeeField({ id, label, value, onChange, gst }: RupeeFieldProps) {
  const labelNode = (
    <Label htmlFor={id} className="text-sm font-medium text-card-foreground">
      {label}
    </Label>
  );
  return (
    <div className="space-y-2">
      {gst ? (
        <div className="flex items-center gap-2">
          {labelNode}
          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5">
            <input
              type="checkbox"
              aria-label={gst.ariaLabel}
              checked={gst.checked}
              onChange={(event) => gst.onChange(event.target.checked)}
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
          id={id}
          type="number"
          min={0}
          value={value || ""}
          // D10: `min` is only an attribute — type="number" still yields "-5",
          // and passing it through poisons the payload. Clamp at the source;
          // NaN (a stray "e", "-") collapses to 0.
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? 0 : Math.max(0, Number(raw) || 0));
          }}
          onFocus={selectInputValueOnFocus}
          className="h-10 pl-10"
          placeholder="0"
        />
      </div>
    </div>
  );
}

export interface AgreementTermsFieldsProps {
  /** Namespaces every field id (`${idPrefix}-fee`, …) so two forms never clash. */
  idPrefix: string;
  /** Label of the fee field — "Renewal fee" in the renewal dialog. */
  feeLabel?: string;
  value: AgreementTermsFieldsValue;
  onChange: (patch: Partial<AgreementTermsFieldsValue>) => void;
}

/**
 * Fee grid with per-field GST pills + installment plan block. Pure inputs —
 * the owning form holds the state and runs `validateAgreementTermsFields`.
 */
export function AgreementTermsFields({
  idPrefix,
  feeLabel = "Franchise Fee",
  value,
  onChange,
}: AgreementTermsFieldsProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
      data-testid="agreement-terms-fields"
    >
      <RupeeField
        id={`${idPrefix}-fee`}
        label={feeLabel}
        value={value.franchiseFee}
        onChange={(franchiseFee) => onChange({ franchiseFee })}
        gst={{
          checked: value.gstFranchiseFee,
          onChange: (gstFranchiseFee) => onChange({ gstFranchiseFee }),
          ariaLabel: `${feeLabel} incl. GST`,
        }}
      />

      <RupeeField
        id={`${idPrefix}-kit-cost`}
        label="Kit Cost"
        value={value.kitCost}
        onChange={(kitCost) => onChange({ kitCost })}
      />

      <RupeeField
        id={`${idPrefix}-material-cost`}
        label="Material Cost"
        value={value.materialCost}
        onChange={(materialCost) => onChange({ materialCost })}
        gst={{
          checked: value.gstMaterialCost,
          onChange: (gstMaterialCost) => onChange({ gstMaterialCost }),
          ariaLabel: "Material cost incl. GST",
        }}
      />

      <RupeeField
        id={`${idPrefix}-monthly-fee`}
        label="Monthly Fee"
        value={value.monthlyFee}
        onChange={(monthlyFee) => onChange({ monthlyFee })}
      />

      <RupeeField
        id={`${idPrefix}-royalty`}
        label="Royalty"
        value={value.royalty}
        onChange={(royalty) => onChange({ royalty })}
        gst={{
          checked: value.gstRoyalty,
          onChange: (gstRoyalty) => onChange({ gstRoyalty }),
          ariaLabel: "Royalty incl. GST",
        }}
      />

      <RupeeField
        id={`${idPrefix}-ci-share`}
        label="CI Share"
        value={value.ciShare}
        onChange={(ciShare) => onChange({ ciShare })}
      />

      <RupeeField
        id={`${idPrefix}-franchise-share`}
        label="Franchise Share"
        value={value.franchiseShare}
        onChange={(franchiseShare) => onChange({ franchiseShare })}
      />

      {/* Tenure */}
      <div className="space-y-2">
        <Label
          htmlFor={`${idPrefix}-tenure`}
          className="text-sm font-medium text-card-foreground"
        >
          Agreement Tenure (months)
        </Label>
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
      </div>

      {/* Installment */}
      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/10 p-4 md:col-span-2 lg:col-span-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`${idPrefix}-installment`}
            checked={value.installment}
            onCheckedChange={(checked) =>
              onChange({ installment: checked === true })
            }
          />
          <Label
            htmlFor={`${idPrefix}-installment`}
            className="cursor-pointer text-sm font-medium text-card-foreground"
          >
            Installment plan
          </Label>
        </div>
        <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor={`${idPrefix}-installment-months`}
              className="text-sm font-medium text-card-foreground"
            >
              Installment Months
            </Label>
            <Input
              id={`${idPrefix}-installment-months`}
              type="number"
              min={1}
              value={value.installmentMonths || ""}
              disabled={!value.installment}
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
          </div>
          <div className="space-y-2">
            <Label
              htmlFor={`${idPrefix}-down-payment`}
              className="text-sm font-medium text-card-foreground"
            >
              Down Payment Amount
            </Label>
            <Input
              id={`${idPrefix}-down-payment`}
              type="number"
              min={0}
              value={value.downPayment || ""}
              disabled={!value.installment}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  downPayment:
                    raw === "" ? 0 : Math.max(0, Number(raw) || 0),
                });
              }}
              onFocus={selectInputValueOnFocus}
              className="h-10"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
