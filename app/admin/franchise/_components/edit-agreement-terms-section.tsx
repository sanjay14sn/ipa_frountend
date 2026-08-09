"use client";

import { IndianRupee } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogFormField,
  DialogFormGrid,
  DialogStateMessage,
} from "@/components/shared/dialog";
import { FormSection } from "@/components/shared/form-section";
import { StatusBadge, formatStatusLabel } from "@/components/shared";
import { getAgreementActionVisibility } from "@/components/agreements/record-detail/agreement-utils";
import { selectInputValueOnFocus } from "@/lib/select-input-on-focus";
import type {
  AgreementRecord,
  UpdateAgreementDetailsInput,
} from "@/services/agreement.service";

/** Form state mirroring the editable fields of PATCH /admin/agreement/:id. */
export interface AgreementTermsFormState {
  title: string;
  notes: string;
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

/** Agreements whose details are still editable (unsigned; CI kinds excluded). */
export function editableAgreementsFrom(
  agreements: AgreementRecord[] | null | undefined,
): AgreementRecord[] {
  return (agreements ?? []).filter(
    (agreement) => getAgreementActionVisibility(agreement, "admin").editTerms,
  );
}

export function agreementTermsFormFromRecord(
  agreement: AgreementRecord,
): AgreementTermsFormState {
  return {
    title: agreement.title ?? "",
    notes: agreement.notes ?? "",
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
 * Sparse diff for the PATCH — only fields the admin actually changed are
 * sent, so an untouched fee doesn't churn the derived receivable plan.
 * A blanked title is treated as unchanged (titles can't be cleared).
 */
export function buildAgreementDetailsPatch(
  initial: AgreementTermsFormState,
  current: AgreementTermsFormState,
): UpdateAgreementDetailsInput {
  const patch: UpdateAgreementDetailsInput = {};
  const title = current.title.trim();
  if (title && title !== initial.title.trim()) patch.title = title;
  if (current.notes.trim() !== initial.notes.trim()) {
    patch.notes = current.notes.trim();
  }
  const numericKeys = [
    "tenure",
    "franchiseFee",
    "monthlyFee",
    "royalty",
    "materialCost",
    "kitCost",
    "ciShare",
    "franchiseShare",
  ] as const;
  for (const key of numericKeys) {
    if (current[key] !== initial[key]) patch[key] = current[key];
  }
  const booleanKeys = [
    "gstFranchiseFee",
    "gstRoyalty",
    "gstMaterialCost",
    "installment",
  ] as const;
  for (const key of booleanKeys) {
    if (current[key] !== initial[key]) patch[key] = current[key];
  }
  if (current.installment) {
    if (current.installmentMonths !== initial.installmentMonths) {
      patch.installmentMonths = current.installmentMonths;
    }
    if (current.downPayment !== initial.downPayment) {
      patch.downPayment = current.downPayment;
    }
    // Turning the plan on needs the shape fields even when they equal the
    // stale values of a previously disabled plan.
    if (patch.installment === true) {
      patch.installmentMonths = current.installmentMonths;
      patch.downPayment = current.downPayment;
    }
  }
  return patch;
}

/**
 * Pre-submit guards mirroring the backend's own invariants, so the admin gets a
 * specific message instead of a 400. That matters more than usual here: a
 * rejected agreement patch is the failure half of D2, and every rejection the
 * client can pre-empt is a partial save that never happens.
 *
 * Returns an error message, or null when the terms are submittable.
 */
export function validateAgreementTermsForm(
  form: AgreementTermsFormState,
  agreement: AgreementRecord | null,
): string | null {
  if (form.tenure < 1) {
    return "Enter the agreement tenure in months";
  }
  // The backend keeps an APPROVED agreement payable (InvalidAgreementTermsError).
  if (agreement?.status === "APPROVED" && form.franchiseFee <= 0) {
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

export interface EditAgreementTermsSectionProps {
  /** Every agreement of the franchise — the section filters to editable ones. */
  agreements: AgreementRecord[] | null | undefined;
  selectedId: number | null;
  onSelect: (agreementId: number) => void;
  value: AgreementTermsFormState | null;
  onChange: (patch: Partial<AgreementTermsFormState>) => void;
}

/**
 * "Agreement terms" section of the admin edit-franchise dialog. Editable only
 * while the agreement is unsigned (DRAFT, or APPROVED before the franchisee
 * signs) — mirrors the backend gate on PATCH /admin/agreement/:id.
 */
export function EditAgreementTermsSection({
  agreements,
  selectedId,
  onSelect,
  value,
  onChange,
}: EditAgreementTermsSectionProps) {
  const editable = editableAgreementsFrom(agreements);
  const selected =
    editable.find((agreement) => agreement.id === selectedId) ?? null;

  return (
    <FormSection
      title="Agreement terms"
      description="Editable until the franchisee signs the agreement."
    >
      {editable.length === 0 ? (
        <DialogStateMessage
          tone="info"
          title={
            (agreements?.length ?? 0) > 0
              ? "Agreement terms are locked"
              : "No agreement to edit"
          }
          description={
            (agreements?.length ?? 0) > 0
              ? "Every agreement of this franchise has been signed. Signed terms are the artifact of record — issue a renewal to change them."
              : "This franchise has no agreement yet. Terms are created during the approval flow."
          }
        />
      ) : !selected || !value ? null : (
        <div className="space-y-4">
          {editable.length > 1 ? (
            <DialogFormField
              id="edit-agreement-target"
              label="Agreement"
              hint="Only unsigned agreements are listed."
            >
              <Select
                value={String(selected.id)}
                onValueChange={(next) => onSelect(Number(next))}
              >
                <SelectTrigger id="edit-agreement-target">
                  <SelectValue placeholder="Select agreement" />
                </SelectTrigger>
                <SelectContent>
                  {editable.map((agreement) => (
                    <SelectItem key={agreement.id} value={String(agreement.id)}>
                      {agreement.programName ??
                        agreement.title ??
                        "Agreement"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DialogFormField>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={formatStatusLabel(selected.status ?? "Unknown")}
            />
            <span className="text-xs text-muted-foreground">
              {selected.programName ?? selected.title ?? ""}
            </span>
          </div>

          <DialogFormField id="edit-agreement-title" label="Agreement title">
            <Input
              id="edit-agreement-title"
              value={value.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </DialogFormField>

          <DialogFormField id="edit-agreement-notes" label="Notes">
            <Input
              id="edit-agreement-notes"
              value={value.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              placeholder="Internal notes"
            />
          </DialogFormField>

          <DialogFormGrid cols={2}>
            <DialogFormField id="edit-agreement-fee" label="Franchise Fee *">
              <RupeeInput
                id="edit-agreement-fee"
                value={value.franchiseFee}
                onChange={(franchiseFee) => onChange({ franchiseFee })}
              />
            </DialogFormField>
            <DialogFormField id="edit-agreement-kit-cost" label="Kit Cost">
              <RupeeInput
                id="edit-agreement-kit-cost"
                value={value.kitCost}
                onChange={(kitCost) => onChange({ kitCost })}
              />
            </DialogFormField>
            <DialogFormField
              id="edit-agreement-material-cost"
              label="Material Cost"
            >
              <RupeeInput
                id="edit-agreement-material-cost"
                value={value.materialCost}
                onChange={(materialCost) => onChange({ materialCost })}
              />
            </DialogFormField>
            <DialogFormField
              id="edit-agreement-monthly-fee"
              label="Monthly Fee"
            >
              <RupeeInput
                id="edit-agreement-monthly-fee"
                value={value.monthlyFee}
                onChange={(monthlyFee) => onChange({ monthlyFee })}
              />
            </DialogFormField>
            <DialogFormField id="edit-agreement-royalty" label="Royalty">
              <RupeeInput
                id="edit-agreement-royalty"
                value={value.royalty}
                onChange={(royalty) => onChange({ royalty })}
              />
            </DialogFormField>
            <DialogFormField id="edit-agreement-ci-share" label="CI Share">
              <RupeeInput
                id="edit-agreement-ci-share"
                value={value.ciShare}
                onChange={(ciShare) => onChange({ ciShare })}
              />
            </DialogFormField>
            <DialogFormField
              id="edit-agreement-franchise-share"
              label="Franchise Share"
            >
              <RupeeInput
                id="edit-agreement-franchise-share"
                value={value.franchiseShare}
                onChange={(franchiseShare) => onChange({ franchiseShare })}
              />
            </DialogFormField>
            <DialogFormField
              id="edit-agreement-tenure"
              label="Agreement Tenure (months) *"
            >
              <Input
                id="edit-agreement-tenure"
                type="number"
                min={1}
                value={value.tenure || ""}
                onChange={(event) =>
                  onChange({
                    tenure:
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value),
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
                  id="edit-agreement-installment-months"
                  label="Installment Months *"
                >
                  <Input
                    id="edit-agreement-installment-months"
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
                  id="edit-agreement-down-payment"
                  label="Down Payment Amount"
                >
                  <RupeeInput
                    id="edit-agreement-down-payment"
                    value={value.downPayment}
                    onChange={(downPayment) => onChange({ downPayment })}
                  />
                </DialogFormField>
              </DialogFormGrid>
            ) : null}
          </div>
        </div>
      )}
    </FormSection>
  );
}
